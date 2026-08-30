import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    createdAt: Date;
    subscriptionPlan: 'ombre' | 'nocturne' | 'abyssal';
    subscriptionPeriod: 'week' | 'month' | 'year';
    fcmToken?: string;
    refreshToken?:       string;
    refreshTokenExpiry?: Date;
    dailySwipes:    { count: number; date: string };
    monthlyElegies: { count: number; month: string };
    monthlyEvents:  { count: number; month: string };
    boostCredits:   { count: number; lastReset: Date | null };
    banned:         boolean;
    bannedReason?:  string;
}

const UserSchema = new Schema<IUser>({
    email:              { type: String, required: true, unique: true, lowercase: true },
    passwordHash:       { type: String, required: true },
    subscriptionPlan:   { type: String, enum: ['ombre','nocturne','abyssal'], default: 'ombre' },
    subscriptionPeriod: { type: String, enum: ['week','month','year'], default: 'month' },
    fcmToken:            { type: String },
    refreshToken:        { type: String, default: null },
    refreshTokenExpiry:  { type: Date,   default: null },
    dailySwipes: {
        count: { type: Number, default: 0 },
        date:  { type: String, default: '' },
    },
    monthlyElegies: {
        count: { type: Number, default: 0 },
        month: { type: String, default: '' },
    },
    monthlyEvents: {
        count: { type: Number, default: 0 },
        month: { type: String, default: '' },
    },
    boostCredits: {
        count:     { type: Number, default: 0 },
        lastReset: { type: Date,   default: null },
    },
    banned:       { type: Boolean, default: false },
    bannedReason: { type: String },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
