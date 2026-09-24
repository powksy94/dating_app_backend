import mongoose, { Schema, Document } from 'mongoose';
import { PUSH_LOCALES, PushLocale } from '../services/push-messages.js';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    createdAt: Date;
    subscriptionPlan: 'ombre' | 'nocturne' | 'abyssal';
    subscriptionPeriod: 'week' | 'month' | 'year';
    fcmToken?: string;
    /** Language of the app on the user's device, sent with the push token.
     * Picks the language of the push notifications (see push-messages.ts). */
    locale:   PushLocale;
    refreshToken?:       string;
    refreshTokenExpiry?: Date;
    dailySwipes:    { count: number; date: string };
    monthlyElegies: { count: number; month: string };
    monthlyEvents:  { count: number; month: string };
    boostCredits:   { count: number; lastReset: Date | null };
    banned:         boolean;
    bannedReason?:  string;
    /** Set once at registration from the build that created the account (see
     * auth.controller.ts). Keeps test accounts (internal/closed testing) out of
     * the real discovery pool, and vice versa. */
    isTestAccount:  boolean;
    /** Founding-member launch gift: set to 'pending' at registration for the
     * first 50 real accounts (see PromoCounter, auth.controller.ts), then
     * 'claimed' once the reveal animation's claim call succeeds. Absent for
     * every account outside that window. */
    foundingMemberReward?: 'pending' | 'claimed';
}

const UserSchema = new Schema<IUser>({
    email:              { type: String, required: true, unique: true, lowercase: true },
    passwordHash:       { type: String, required: true },
    subscriptionPlan:   { type: String, enum: ['ombre','nocturne','abyssal'], default: 'ombre' },
    subscriptionPeriod: { type: String, enum: ['week','month','year'], default: 'month' },
    fcmToken:            { type: String },
    // 'fr' by default: accounts that predate this field, and app versions that do
    // not send a locale yet, keep receiving French notifications as before.
    locale:              { type: String, enum: PUSH_LOCALES, default: 'fr' },
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
    isTestAccount: { type: Boolean, default: false },
    foundingMemberReward: { type: String, enum: ['pending', 'claimed'] },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
