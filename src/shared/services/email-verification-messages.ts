import type { PushLocale } from './push-messages.js';

/** The email-verification email's text, in one language. */
interface VerificationEmailTexts {
    subject: string;
    text: (code: string) => string;
    html: (code: string) => string;
}

const fr: VerificationEmailTexts = {
    subject: 'Nocturne — Code de vérification',
    text: (code) => `Bienvenue sur Nocturne ! Voici ton code de vérification : ${code}\n\nIl est valable 15 minutes.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>Bienvenue ! Voici ton code de vérification d'email :</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">Valable 15 minutes.</p>
        </div>`,
};

const en: VerificationEmailTexts = {
    subject: 'Nocturne — Verification code',
    text: (code) => `Welcome to Nocturne! Your verification code is: ${code}\n\nIt's valid for 15 minutes.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>Welcome! Here's your email verification code:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">Valid for 15 minutes.</p>
        </div>`,
};

const CATALOG = { fr, en } satisfies Record<string, VerificationEmailTexts>;

/** The verification email texts for a user's language. Anything unknown
 * falls back to French, matching push-messages.ts's convention. */
export function emailVerificationTexts(locale: PushLocale | string | undefined): VerificationEmailTexts {
    return locale === 'en' ? CATALOG.en : CATALOG.fr;
}
