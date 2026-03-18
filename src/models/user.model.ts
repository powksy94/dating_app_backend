import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    createdAt: Date;
}
const UserSchema = new Schema<IUser>({
    email:          { type: String, required: true, unique: true, lowercase: true },
    passwordHash:   { type: String, required: true },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);