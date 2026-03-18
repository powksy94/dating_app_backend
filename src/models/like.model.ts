import mongoose, { Schema, Document } from "mongoose";

export interface ILike extends Document {
    from: mongoose.Types.ObjectId;
    to:   mongoose.Types.ObjectId;
}

const LikeSchema = new Schema<ILike>({
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

LikeSchema.index({ from: 1, to: 1 }, { unique: true });

export const Like = mongoose.model<ILike>('Like', LikeSchema);