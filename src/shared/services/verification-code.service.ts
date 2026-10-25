import crypto from 'crypto';
import { Document, Model, Types } from 'mongoose';

export const MAX_ATTEMPTS = 5;

/** Shared doc shape for any one-time verification code (password reset,
 * email verification, ...): a live, single-use, attempt-limited code tied to
 * a user, with a TTL index on expiresAt so Mongo drops it automatically. */
export interface IVerificationCode extends Document {
    userId:     Types.ObjectId;
    codeHash:   string;
    expiresAt:  Date;
    attempts:   number;
    consumedAt: Date | null;
    createdAt:  Date;
}

/** HMAC-derived code hash, keyed with JWT_SECRET (an existing secret, no new
 * one needed) over `${userId}:${code}`. Shared by every verification-code
 * feature so there's only one derivation scheme to reason about. */
export function hashVerificationCode(userId: string, code: string): string {
    return crypto.createHmac('sha256', process.env.JWT_SECRET!)
        .update(`${userId}:${code}`)
        .digest('hex');
}

export function generateSixDigitCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Finds the live pending code for a user against a given model and checks
 * it, without consuming it. Increments attempts on a wrong guess so the
 * caller gets the lockout for free. Generic over any model sharing the
 * IVerificationCode doc shape (PasswordReset, EmailVerification, ...). */
export async function checkVerificationCode<T extends IVerificationCode>(
    model: Model<T>, userId: string, code: string,
): Promise<T | null> {
    const pending = await model.findOne({
        userId, consumedAt: null, expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!pending || pending.attempts >= MAX_ATTEMPTS) return null;

    const expected = Buffer.from(hashVerificationCode(userId, code), 'hex');
    const actual   = Buffer.from(pending.codeHash, 'hex');
    const matches  = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
        await model.updateOne({ _id: pending._id }, { $inc: { attempts: 1 } });
        return null;
    }
    return pending;
}
