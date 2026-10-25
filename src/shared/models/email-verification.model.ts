import mongoose, { Schema } from 'mongoose';
import type { IVerificationCode } from '../services/verification-code.service.js';

/** A pending email-confirmation code for one account, issued right after
 * registration. Same shape/TTL pattern as password-reset.model.ts. */
export interface IEmailVerification extends IVerificationCode {}

const EmailVerificationSchema = new Schema<IEmailVerification>({
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash:   { type: String, required: true },
    expiresAt:  { type: Date, required: true },
    attempts:   { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

// TTL index: Mongo's background sweep (runs roughly every 60s) deletes the
// document once expiresAt is in the past, whether or not it was consumed.
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerification = mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema);
