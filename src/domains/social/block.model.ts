import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
    blocker: mongoose.Types.ObjectId;
    blocked: mongoose.Types.ObjectId;
}

const BlockSchema = new Schema<IBlock>({
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block = mongoose.model<IBlock>('Block', BlockSchema);
