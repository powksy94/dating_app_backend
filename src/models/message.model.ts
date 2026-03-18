import { timeStamp } from "console";
import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
    matchId: mongoose.Types.ObjectId;
    sender:  mongoose.Types.ObjectId;
    text:    string;
}

const MessageSchema = new Schema<IMessage>({
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    sender:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:    { type: String, required: true },
}, { timestamps: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);