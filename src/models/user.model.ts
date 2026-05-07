import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    createdAt: Date;
    subscriptionPlan: 'ombre' | 'nocturne' | 'abyssal';
    subscriptionPeriod: 'week' | 'month' | 'year';
    fcmToken?: string;
}
const UserSchema = new Schema<IUser>({
    email:              { type: String, required: true, unique: true, lowercase: true },
    passwordHash:       { type: String, required: true },
    subscriptionPlan:   { type: String, enum: ['ombre','nocturne','abyssal'], default: 'ombre' },
    subscriptionPeriod: { type: String, enum: ['week','month','year'], default: 'month' },
    fcmToken:           { type: String },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);