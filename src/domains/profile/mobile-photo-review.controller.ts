import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { PhotoReview } from '../../shared/models/photo-review.model.js';
import { Profile } from './profile.model.js';
import { MAX_PHOTOS } from './photo-urls.js';
import cloudinary from '../../infrastructure/config/cloudinary.js';

export async function listPendingPhotosForMobile(_req: AuthRequest, res: Response): Promise<void> {
    const reviews = await PhotoReview.find()
        .sort({ createdAt: 1 })
        .populate('owner', 'email')
        .lean();
    res.json(reviews.map((r) => ({
        _id:              r._id,
        url:              r.url,
        ownerEmail:       (r.owner as unknown as { email?: string })?.email ?? '',
        moderationLabels: r.moderationLabels,
        createdAt:        r.createdAt,
    })));
}

export async function approvePhotoFromMobile(req: AuthRequest, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid photo id' });
        return;
    }
    const review = await PhotoReview.findById(req.params.id);
    if (!review) { res.status(404).json({ message: 'Photo not found' }); return; }

    const profile = await Profile.findOneAndUpdate(
        { owner: review.owner },
        { $push: { photos: { $each: [review.url], $slice: -MAX_PHOTOS } } },
        { new: true },
    );
    if (profile && !profile.avatarUrl) {
        await Profile.findByIdAndUpdate(profile._id, { avatarUrl: profile.photos[0] ?? '' });
    }
    await review.deleteOne();
    res.json({ message: 'Photo approved' });
}

export async function rejectPhotoFromMobile(req: AuthRequest, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid photo id' });
        return;
    }
    const review = await PhotoReview.findById(req.params.id);
    if (!review) { res.status(404).json({ message: 'Photo not found' }); return; }

    await cloudinary.uploader.destroy(review.cloudinaryPublicId).catch(() => {});
    await review.deleteOne();
    res.json({ message: 'Photo rejected' });
}
