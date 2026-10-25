import { Response } from "express";
import { User, IUser } from "../../shared/models/user.model.js";
import { EmailVerification } from "../../shared/models/email-verification.model.js";
import { sendEmailVerificationEmail } from "../../shared/services/mailer.service.js";
import { hashVerificationCode, checkVerificationCode, generateSixDigitCode } from "../../shared/services/verification-code.service.js";
import { logger } from "../../infrastructure/config/logger.js";
import type { AuthRequest } from "../../shared/middleware/auth.middleware.js";

const CODE_TTL_MS        = 15 * 60 * 1000; // 15 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;      // 60 seconds
const INVALID_CODE = { message: 'Invalid or expired code' };

/** Generates, stores and emails a fresh code for this user. Fail-quiet on
 * send failure (logged, never thrown) — called both right after register()
 * and from resendVerificationCode, matching forgotPassword's convention of
 * never letting a Resend outage fail the surrounding request. */
export async function issueVerificationCode(user: IUser): Promise<void> {
    await EmailVerification.deleteMany({ userId: user._id });
    const code = generateSixDigitCode();
    await EmailVerification.create({
        userId:    user._id,
        codeHash:  hashVerificationCode(user._id.toString(), code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    try {
        await sendEmailVerificationEmail(user.email, code, user.locale);
    } catch (err) {
        logger.error("Inscription : échec d'envoi du mail de vérification", { err });
    }
}

export async function verifyEmail(req: AuthRequest, res: Response): Promise<void> {
    const { code } = req.body as { code?: string };
    if (!code) {
        res.status(400).json({ message: 'code is required' });
        return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }
    if (user.emailVerified) {
        res.json({ message: 'Email already verified' });
        return;
    }

    const pending = await checkVerificationCode(EmailVerification, user._id.toString(), code);
    if (!pending) {
        res.status(400).json(INVALID_CODE);
        return;
    }

    const claim = await EmailVerification.updateOne(
        { _id: pending._id, consumedAt: null },
        { $set: { consumedAt: new Date() } },
    );
    if (claim.modifiedCount === 0) {
        res.status(400).json(INVALID_CODE);
        return;
    }

    user.emailVerified = true;
    await user.save();

    res.json({ message: 'Email verified' });
}

export async function resendVerificationCode(req: AuthRequest, res: Response): Promise<void> {
    const user = await User.findById(req.userId);
    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }
    if (user.emailVerified) {
        res.status(400).json({ message: 'Email already verified' });
        return;
    }

    const previous = await EmailVerification.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (previous && Date.now() - previous.createdAt.getTime() < RESEND_COOLDOWN_MS) {
        res.status(202).json({ message: 'Code already sent' });
        return;
    }

    await issueVerificationCode(user);
    res.status(202).json({ message: 'Code sent' });
}
