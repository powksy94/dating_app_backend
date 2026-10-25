import type { PushLocale } from './push-messages.js';

/** The password-reset email's text, in one language. */
interface ResetEmailTexts {
    subject: string;
    text: (code: string) => string;
    html: (code: string) => string;
}

const fr: ResetEmailTexts = {
    subject: 'Nocturne — Code de réinitialisation',
    text: (code) => `Voici ton code de réinitialisation : ${code}\n\nIl est valable 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>Voici ton code de réinitialisation de mot de passe :</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">Valable 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
        </div>`,
};

const en: ResetEmailTexts = {
    subject: 'Nocturne — Password reset code',
    text: (code) => `Your password reset code is: ${code}\n\nIt's valid for 15 minutes. If you didn't request this, ignore this email.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>Your password reset code is:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">Valid for 15 minutes. If you didn't request this, ignore this email.</p>
        </div>`,
};

const CATALOG = { fr, en } satisfies Record<string, ResetEmailTexts>;

/** The reset email texts for a user's language. Anything unknown falls back
 * to French, matching push-messages.ts's convention. */
export function resetEmailTexts(locale: PushLocale | string | undefined): ResetEmailTexts {
    return locale === 'en' ? CATALOG.en : CATALOG.fr;
}
