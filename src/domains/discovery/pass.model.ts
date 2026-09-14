import mongoose, { Schema, Document } from "mongoose";

export interface IPass extends Document {
    from: mongoose.Types.ObjectId;
    to:   mongoose.Types.ObjectId;
}

const PassSchema = new Schema<IPass>({
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

PassSchema.index({ from: 1, to: 1 }, { unique: true });

export const Pass = mongoose.model<IPass>('Pass', PassSchema);
