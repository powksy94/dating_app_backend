import mongoose, { Schema, Document } from "mongoose";

export interface IMatch extends Document {
    users: mongoose.Types.ObjectId[];
}

const MatchSchema = new Schema<IMatch>({
    users: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
}, { timestamps: true });

export const Match = mongoose.model<IMatch>('Match', MatchSchema);