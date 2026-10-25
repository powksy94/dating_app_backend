import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from "../../shared/models/user.model.js";
import { PasswordReset } from "../../shared/models/password-reset.model.js";
import { sendPasswordResetEmail } from "../../shared/services/mailer.service.js";
import { logger } from "../../infrastructure/config/logger.js";

const CODE_TTL_MS        = 15 * 60 * 1000; // 15 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;      // 60 seconds
const MAX_ATTEMPTS       = 5;

function hashCode(userId: string, code: string): string {
    return crypto.createHmac('sha256', process.env.JWT_SECRET!)
        .update(`${userId}:${code}`)
        .digest('hex');
}

// Identical status/body for every outcome of forgotPassword — unknown email,
// known email, known email but within the resend cooldown. Any divergence
// here is an email-enumeration leak, so don't special-case any branch below.
const GENERIC_ACCEPTED = { message: 'If an account exists for this email, a reset code has been sent.' };

export async function forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email?: string };
    if (!email) {
        res.status(400).json({ message: 'email is required' });
        return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        res.status(202).json(GENERIC_ACCEPTED);
        return;
    }

    const previous = await PasswordReset.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (previous && Date.now() - previous.createdAt.getTime() < RESEND_COOLDOWN_MS) {
        res.status(202).json(GENERIC_ACCEPTED);
        return;
    }

    // At most one pending code per account: drop any prior row outright.
    await PasswordReset.deleteMany({ userId: user._id });

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await PasswordReset.create({
        userId:    user._id,
        codeHash:  hashCode(user._id.toString(), code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    try {
        await sendPasswordResetEmail(user.email, code, user.locale);
    } catch (err) {
        // Fail quiet: the response stays identical either way.
        logger.error("Resend: échec d'envoi du mail de réinitialisation", { err });
    }

    res.status(202).json(GENERIC_ACCEPTED);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
    const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string };
    if (!email || !code || !newPassword) {
        res.status(400).json({ message: 'email, code and newPassword are required' });
        return;
    }
    if (newPassword.length < 12) {
        res.status(400).json({ message: 'The new password must be at least 12 characters long' });
        return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        res.status(400).json({ message: 'Invalid or expired code' });
        return;
    }

    const pending = await PasswordReset.findOne({
        userId: user._id, consumedAt: null, expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!pending || pending.attempts >= MAX_ATTEMPTS) {
        res.status(400).json({ message: 'Invalid or expired code' });
        return;
    }

    const expected = Buffer.from(hashCode(user._id.toString(), code), 'hex');
    const actual   = Buffer.from(pending.codeHash, 'hex');
    const matches  = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
        await PasswordReset.updateOne({ _id: pending._id }, { $inc: { attempts: 1 } });
        res.status(400).json({ message: 'Invalid or expired code' });
        return;
    }

    // Race-safe single-use: succeeds only if still unconsumed at this exact
    // instant, so two concurrent requests with the same code can't both pass.
    const claim = await PasswordReset.updateOne(
        { _id: pending._id, consumedAt: null },
        { $set: { consumedAt: new Date() } },
    );
    if (claim.modifiedCount === 0) {
        res.status(400).json({ message: 'Invalid or expired code' });
        return;
    }

    user.passwordHash       = await bcrypt.hash(newPassword, 12);
    user.refreshToken       = undefined;
    user.refreshTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
}
