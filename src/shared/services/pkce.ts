import { createHash, randomBytes } from 'crypto';

const base64url = (buffer: Buffer): string =>
    buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export interface PkcePair {
    codeVerifier: string;
    codeChallenge: string;
}

/**
 * PKCE (RFC 7636): protects the authorization code exchanged during an OAuth2
 * flow from being replayed if it's intercepted on the device (e.g. a custom
 * URL scheme captured by another app). The verifier is kept server-side for
 * the lifetime of the flow and sent again at the token exchange step; only
 * its S256 hash (the challenge) is ever put in the authorization URL.
 */
export function generatePkcePair(): PkcePair {
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
    return { codeVerifier, codeChallenge };
}
