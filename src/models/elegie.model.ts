import mongoose, { Schema, Document } from 'mongoose';

export interface IElegie extends Document {
    from:         mongoose.Types.ObjectId;
    to:           mongoose.Types.ObjectId;
    text:         string;
    status:       'pending' | 'matched' | 'rejected';
    dislikeCount: number;
}

const ElegieSchema = new Schema<IElegie>({
    from:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:         { type: String, required: true, maxlength: 200 },
    status:       { type: String, enum: ['pending', 'matched', 'rejected'], default: 'pending' },
    dislikeCount: { type: Number, default: 0 },
}, { timestamps: true });

ElegieSchema.index({ from: 1, to: 1 }, { unique: true });

export const Elegie = mongoose.model<IElegie>('Elegie', ElegieSchema);
