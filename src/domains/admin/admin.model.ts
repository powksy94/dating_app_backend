import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
    email: string;
    passwordHash: string;
    // Mobile (User) account designated to receive the login approval push
    // notification. Set once, never re-derived from email on each login
    // attempt: mobile signup doesn't verify email ownership, so a dynamic
    // email-based lookup could be hijacked by registering the same email.
    linkedUserId?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
    email:          { type: String, required: true, unique: true, lowercase: true },
    passwordHash:   { type: String, required: true },
    linkedUserId:   { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);