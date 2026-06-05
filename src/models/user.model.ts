import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    createdAt: Date;
    subscriptionPlan: 'ombre' | 'nocturne' | 'abyssal';
    subscriptionPeriod: 'week' | 'month' | 'year';
    fcmToken?: string;
    dailySwipes:    { count: number; date: string };
    monthlyElegies: { count: number; month: string };
    monthlyEvents:  { count: number; month: string };
    boostCredits:   { count: number; lastReset: Date | null };
}

const UserSchema = new Schema<IUser>({
    email:              { type: String, required: true, unique: true, lowercase: true },
    passwordHash:       { type: String, required: true },
    subscriptionPlan:   { type: String, enum: ['ombre','nocturne','abyssal'], default: 'ombre' },
    subscriptionPeriod: { type: String, enum: ['week','month','year'], default: 'month' },
    fcmToken:           { type: String },
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
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
