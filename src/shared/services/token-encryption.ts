import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { logger } from '../../infrastructure/config/logger.js';

// AES-256-GCM: a stored OAuth token (Discord access/refresh token, and any
// future platform's) must never sit in Mongo in plain text. Node's built-in
// crypto module is used instead of a new dependency.
const ALGORITHM   = 'aes-256-gcm';
const IV_LENGTH   = 12; // recommended for GCM
const rawKey      = process.env.TOKEN_ENCRYPTION_KEY;

if (!rawKey) {
    logger.warn('TOKEN_ENCRYPTION_KEY manquant — les connexions OAuth (Discord...) sont désactivées.');
}

// 32 bytes, from a base64 key in the environment (see .env.example for how to
// generate one). A wrong-length or malformed key disables the feature the
// same way a missing one does, rather than crashing the whole server.
const key = (() => {
    if (!rawKey) return null;
    try {
        const buffer = Buffer.from(rawKey, 'base64');
        return buffer.length === 32 ? buffer : null;
    } catch {
        return null;
    }
})();

if (rawKey && !key) {
    logger.warn('TOKEN_ENCRYPTION_KEY invalide (doit être 32 octets encodés en base64) — les connexions OAuth sont désactivées.');
}

export const tokenEncryptionConfigured = key !== null;

/** `iv:authTag:ciphertext`, all hex. Throws if encryption isn't configured;
 * callers must check `tokenEncryptionConfigured` before ever reaching here. */
export function encryptToken(plainText: string): string {
    if (!key) throw new Error('Token encryption is not configured');
    const iv     = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptToken(stored: string): string {
    if (!key) throw new Error('Token encryption is not configured');
    const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
    if (!ivHex || !authTagHex || !ciphertextHex) throw new Error('Malformed encrypted token');
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
    return plaintext.toString('utf8');
}
