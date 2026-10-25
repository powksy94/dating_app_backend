import mongoose, { Schema, Document } from 'mongoose';

/** A pending password-reset code for one account. At most one live
 * (unconsumed, unexpired) doc per user — forgotPassword deletes any prior
 * doc for the account before creating a new one. Mongo's TTL monitor drops
 * the doc automatically once expiresAt passes, consumed or not — no manual
 * cleanup job needed. */
export interface IPasswordReset extends Document {
    userId:     mongoose.Types.ObjectId;
    codeHash:   string;
    expiresAt:  Date;
    attempts:   number;
    consumedAt: Date | null;
    createdAt:  Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash:   { type: String, required: true },
    expiresAt:  { type: Date, required: true },
    attempts:   { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

// TTL index: Mongo's background sweep (runs roughly every 60s) deletes the
// document once expiresAt is in the past, whether or not it was consumed.
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
