import mongoose, { Schema, Document } from 'mongoose';

/** A photo Rekognition couldn't confidently clear on its own, waiting for a
 * human admin decision. Approving moves its url into Profile.photos;
 * rejecting deletes this doc and the Cloudinary asset. Never shown to
 * anyone but the owner and admins while it exists here. */
export interface IPhotoReview extends Document {
    owner:            mongoose.Types.ObjectId;
    url:              string;
    cloudinaryPublicId: string;
    moderationLabels: { name: string; confidence: number }[];
    createdAt:        Date;
}

const PhotoReviewSchema = new Schema<IPhotoReview>({
    owner:              { type: Schema.Types.ObjectId, ref: 'User', required: true },
    url:                { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    moderationLabels: [{
        _id:        false,
        name:       { type: String, required: true },
        confidence: { type: Number, required: true },
    }],
}, { timestamps: { createdAt: true, updatedAt: false } });

export const PhotoReview = mongoose.model<IPhotoReview>('PhotoReview', PhotoReviewSchema);
