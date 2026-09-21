import { Response } from "express";
import { Profile } from "./profile.model.js";
import { User } from "../../shared/models/user.model.js";
import { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import multer from "multer";
import cloudinary from "../../infrastructure/config/cloudinary.js";
import { sanitizeProfileUpdate } from "./profile-validation.js";
import { reviewBio } from "../social/auto-report.js";
import { logger } from "../../infrastructure/config/logger.js";
import { isPushLocale, PushLocale } from "../../shared/services/push-messages.js";
import { Readable } from 'stream';

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.userId });
    if (!profile) { res.status(404).json({ message: 'Profile not found' }); return; }
    res.json(profile)
}

export async function UptapeMyProfile(req: AuthRequest, res: Response): Promise<void> {
    // Every value is validated (vocabulary, ranges, adult age, favorite bands...),
    // see profile-validation.ts. A value that fails is ignored and the rest is saved.
    const { updates, rejected } = sanitizeProfileUpdate(req.body);

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

export async function uploadPhotos(req: AuthRequest, res: Response): Promise<void> {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ message: 'No file received' });
        return;
    }

    const urls: string[] = [];
    for (const file of files) {
        const url = await new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'nocturne/profiles', resource_type: 'image' },
                (err, result) => err ? reject(err) : resolve(result!.secure_url)
            );
            Readable.from(file.buffer).pipe(stream);
        });
        urls.push(url);
    }

    const profile = await Profile.findOneAndUpdate(
        { owner: req.userId },
        { $set: { photos: urls, avatarUrl: urls[0] } },
        { new: true }
    );
    res.json({ photos: urls, profile });
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