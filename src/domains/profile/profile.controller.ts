import { Response } from "express";
import { Profile } from "./profile.model.js";
import { User } from "../../shared/models/user.model.js";
import { PhotoReview } from "../../shared/models/photo-review.model.js";
import { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import multer from "multer";
import cloudinary from "../../infrastructure/config/cloudinary.js";
import { sanitizeProfileUpdate } from "./profile-validation.js";
import { MAX_PHOTOS } from "./photo-urls.js";
import { classifyPhoto } from "../../infrastructure/config/rekognition.js";
import { reviewBio } from "../social/auto-report.js";
import { logger } from "../../infrastructure/config/logger.js";
import { isPushLocale, PushLocale } from "../../shared/services/push-messages.js";
import { Readable } from 'stream';

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.userId });
    if (!profile) { res.status(404).json({ message: 'Profile not found' }); return; }
    res.json(profile)
}

// So the owner isn't left wondering where a just-uploaded photo went: it
// disappears from Profile.photos entirely while awaiting review, this is
// the only way for them to see it still exists and is pending.
export async function getMyPendingPhotos(req: AuthRequest, res: Response): Promise<void> {
    const reviews = await PhotoReview.find({ owner: req.userId }).select('url createdAt').lean();
    res.json(reviews.map((r) => ({ url: r.url, createdAt: r.createdAt })));
}

export async function UptapeMyProfile(req: AuthRequest, res: Response): Promise<void> {
    // Every value is validated (vocabulary, ranges, adult age, favorite bands...),
    // see profile-validation.ts. A value that fails is ignored and the rest is saved.
    const { updates, rejected } = await sanitizeProfileUpdate(req.body);

    if (rejected.includes('body')) {
        res.status(400).json({ message: 'Invalid request' });
        return;
    }
    // The app is for adults only: an invalid or underage birth date refuses the whole update.
    if (rejected.includes('birthDate')) {
        res.status(400).json({ message: 'Invalid birth date (18 years minimum)' });
        return;
    }
    if (rejected.length) {
        logger.warn(`Profile update: fields refused for user ${req.userId}: ${rejected.join(', ')}`);
    }

    // A photo still waiting for moderation is never valid input here: only
    // the upload/review flow may add or approve a photo. Without this, a
    // client could just replay a pending url it was shown back through this
    // endpoint to skip moderation entirely.
    if (Array.isArray(updates.photos)) {
        const pendingUrls = new Set((await PhotoReview.find({ owner: req.userId }).select('url')).map((p) => p.url));
        const photos = (updates.photos as string[]).filter((url) => !pendingUrls.has(url));
        updates.photos = photos;
        updates.avatarUrl = photos[0] ?? '';
    }

    const profile = await Profile.findOneAndUpdate(
        { owner: req.userId },
        { $set: updates },
        { new: true }
    );

    // A bio with an insult is kept but sent for review (see auto-report.ts). Done
    // in the background so it does not slow the response down.
    if (typeof updates.bio === 'string') {
        reviewBio(req.userId!, updates.bio)
            .catch((err) => logger.warn(`Bio review failed for user ${req.userId}`, { err }));
    }

    res.json(profile);
}

const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.array('photos', 6);

function uploadToCloudinary(buffer: Buffer): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'nocturne/profiles', resource_type: 'image' },
            (err, result) => err ? reject(err) : resolve({ url: result!.secure_url, publicId: result!.public_id }),
        );
        Readable.from(buffer).pipe(stream);
    });
}

// Each photo is classified with AWS Rekognition before it ever reaches
// Cloudinary: clearly explicit/violent/disturbing content (see rekognition.ts
// for the exact policy) is rejected outright and never uploaded at all;
// everything else is uploaded, then either goes straight onto the profile
// (approve) or into the admin review queue (queue) — never both.
export async function uploadPhotos(req: AuthRequest, res: Response): Promise<void> {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ message: 'No file received' });
        return;
    }

    const approved: string[] = [];
    const pending: string[] = [];
    let rejectedCount = 0;

    for (const file of files) {
        const { verdict, labels } = await classifyPhoto(file.buffer);
        if (verdict === 'reject') {
            rejectedCount++;
            continue;
        }

        const { url, publicId } = await uploadToCloudinary(file.buffer);
        if (verdict === 'approve') {
            approved.push(url);
        } else {
            await PhotoReview.create({ owner: req.userId, url, cloudinaryPublicId: publicId, moderationLabels: labels });
            pending.push(url);
        }
    }

    let profile = await Profile.findOne({ owner: req.userId });
    if (approved.length) {
        profile = await Profile.findOneAndUpdate(
            { owner: req.userId },
            { $push: { photos: { $each: approved, $slice: -MAX_PHOTOS } } },
            { new: true },
        );
        if (profile && profile.avatarUrl !== profile.photos[0]) {
            profile = await Profile.findOneAndUpdate(
                { owner: req.userId },
                { $set: { avatarUrl: profile.photos[0] ?? '' } },
                { new: true },
            );
        }
    }

    res.json({ approved, pendingCount: pending.length, rejectedCount, profile });
}

export async function getProfileByUserId(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.params.userId });
    if (!profile) { res.status(404).json({ message: 'Profile not found' }); return; }

    // Record the visit in the background (without blocking the response)
    if (req.userId !== req.params.userId) {
        import('../visit/visit.controller.js')
            .then(({ recordVisit }) => recordVisit(req.userId!, String(req.params.userId)))
            .catch(() => {});
    }

    res.json(profile);
}

export async function saveFcmToken(req: AuthRequest, res: Response): Promise<void> {
    const { token, locale } = req.body as { token: string; locale?: string };
    if (!token) { res.status(400).json({ message: 'Token is required' }); return; }
    // A device token belongs to one account at a time: if another account was
    // signed in on this device (e.g. logout that never reached the server),
    // release the token from it so it stops receiving the new user's pushes.
    await User.updateMany({ _id: { $ne: req.userId }, fcmToken: token }, { fcmToken: null });
    // The locale is optional (older app versions do not send it) and is only
    // stored when it is one we have push texts for.
    const update: { fcmToken: string; locale?: PushLocale } = { fcmToken: token };
    if (isPushLocale(locale)) update.locale = locale;
    await User.findByIdAndUpdate(req.userId, update);
    res.json({ message: 'FCM token saved' });
}