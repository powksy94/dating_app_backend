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

const es: VerificationEmailTexts = {
    subject: 'Nocturne — Código de verificación',
    text: (code) => `¡Bienvenido/a a Nocturne! Tu código de verificación es: ${code}\n\nEs válido durante 15 minutos.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>¡Bienvenido/a! Aquí tienes tu código de verificación de email:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">Válido durante 15 minutos.</p>
        </div>`,
};

const pt: VerificationEmailTexts = {
    subject: 'Nocturne — Código de verificação',
    text: (code) => `Bem-vindo/a ao Nocturne! Seu código de verificação é: ${code}\n\nEle é válido por 15 minutos.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>Bem-vindo/a! Aqui está seu código de verificação de email:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">Válido por 15 minutos.</p>
        </div>`,
};

const de: VerificationEmailTexts = {
    subject: 'Nocturne — Bestätigungscode',
    text: (code) => `Willkommen bei Nocturne! Dein Bestätigungscode lautet: ${code}\n\nEr ist 15 Minuten lang gültig.`,
    html: (code) => `
        <div style="font-family:sans-serif;background:#0D0010;color:#E8E0EE;padding:32px;">
            <h2 style="color:#7B00D4;margin:0 0 16px;">Nocturne</h2>
            <p>Willkommen! Hier ist dein Bestätigungscode für deine E-Mail:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p style="color:#AA9AB5;font-size:13px;">15 Minuten lang gültig.</p>
        </div>`,
};

const CATALOG = { fr, en, es, pt, de } satisfies Record<string, VerificationEmailTexts>;

/** The verification email texts for a user's language. Anything unknown
 * falls back to French, matching push-messages.ts's convention. */
export function emailVerificationTexts(locale: PushLocale | string | undefined): VerificationEmailTexts {
    return locale && locale in CATALOG ? CATALOG[locale as keyof typeof CATALOG] : CATALOG.fr;
}
