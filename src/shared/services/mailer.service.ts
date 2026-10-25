import { resend, resendConfigured } from "../../infrastructure/config/resend.js";
import { resetEmailTexts } from "./password-reset-messages.js";
import type { PushLocale } from "./push-messages.js";

/** Sends the 6-digit reset code by email. Throws if Resend isn't configured
 * or the API call fails — forgotPassword() catches this and logs it without
 * changing its generic response, so a Resend outage can't leak account
 * existence via a different HTTP response. */
export async function sendPasswordResetEmail(
    to: string,
    code: string,
    locale: PushLocale | string | undefined,
): Promise<void> {
    if (!resendConfigured || !resend) {
        throw new Error('Resend is not configured (RESEND_API_KEY missing)');
    }
    const t = resetEmailTexts(locale);
    const { error } = await resend.emails.send({
        from:    process.env.EMAIL_FROM ?? 'Nocturne <noreply@powksy.com>',
        to,
        subject: t.subject,
        html:    t.html(code),
        text:    t.text(code),
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
}
