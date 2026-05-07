import mongoose, { Schema, Document } from "mongoose";

export interface IReplyTo {
    id:        string;
    text:      string;
    sender:    string;
    imageUrl?: string;
}

export interface IMessage extends Document {
    matchId:       mongoose.Types.ObjectId;
    sender:        mongoose.Types.ObjectId;
    text:          string;
    imageUrl?:     string;
    replyTo?:      IReplyTo;
    deletedFor:    mongoose.Types.ObjectId[];
    deletedForAll: boolean;
    readBy:        mongoose.Types.ObjectId[];
}

const MessageSchema = new Schema<IMessage>({
    matchId:       { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    sender:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:          { type: String, default: '' },
    imageUrl:      { type: String },
    replyTo: {
        id:       { type: String },
        text:     { type: String },
        sender:   { type: String },
        imageUrl: { type: String },
    },
    deletedFor:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedForAll: { type: Boolean, default: false },
    readBy:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);