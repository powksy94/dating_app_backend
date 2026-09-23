import { logger } from './logger.js';
import { tokenEncryptionConfigured } from '../../shared/services/token-encryption.js';

const clientId     = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;

// The redirect URI is fixed and never derived from a request: it must be the
// exact one registered on Discord's developer portal for this app.
export const DISCORD_REDIRECT_URI = 'nocturne://oauth-callback';
export const DISCORD_SCOPE = 'identify';

if (!clientId || !clientSecret) {
    logger.warn('DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET manquant(s) — la connexion Discord est désactivée.');
}

/** True once Discord credentials AND token encryption are both configured;
 * connecting an account without being able to store its token safely is worse
 * than not offering the feature at all. */
export const discordConfigured = Boolean(clientId && clientSecret) && tokenEncryptionConfigured;

export interface DiscordTokens {
    accessToken:  string;
    refreshToken: string;
    /** Absolute expiry, computed from Discord's `expires_in` at the time of the call. */
    expiresAt:    Date;
}

interface DiscordTokenResponse {
    access_token:  string;
    refresh_token: string;
    expires_in:    number;
}

function toTokens(data: DiscordTokenResponse): DiscordTokens {
    return {
        accessToken:  data.access_token,
        refreshToken: data.refresh_token,
        // A minute of margin, so a token already expired by the time it's used
        // is refreshed instead of failing the call it was fetched for.
        expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
    };
}

/** The authorization URL to send the user's browser to. */
export function buildDiscordAuthorizeUrl(state: string, codeChallenge: string): string {
    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id', clientId!);
    url.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', DISCORD_SCOPE);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
}

async function requestToken(body: URLSearchParams): Promise<DiscordTokens | null> {
    try {
        const res = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!res.ok) return null;
        return toTokens(await res.json() as DiscordTokenResponse);
    } catch (err) {
        logger.warn('Discord token request failed', { err });
        return null;
    }
}

/** Exchanges an authorization code for tokens. Null if Discord refuses it
 * (wrong/expired code, PKCE mismatch, revoked app...). */
export function exchangeDiscordCode(code: string, codeVerifier: string): Promise<DiscordTokens | null> {
    return requestToken(new URLSearchParams({
        client_id:     clientId!,
        client_secret: clientSecret!,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  DISCORD_REDIRECT_URI,
        code_verifier: codeVerifier,
    }));
}

/** Null when the refresh token itself has been revoked or expired: the
 * connection is unusable and should be dropped, not retried. */
export function refreshDiscordToken(refreshToken: string): Promise<DiscordTokens | null> {
    return requestToken(new URLSearchParams({
        client_id:     clientId!,
        client_secret: clientSecret!,
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
    }));
}

export interface DiscordIdentity {
    id:       string;
    username: string;
    avatarUrl: string | null;
}

/** The connected Discord user's own identity (`identify` scope). Null if the
 * access token is no longer valid. */
export async function getDiscordIdentity(accessToken: string): Promise<DiscordIdentity | null> {
    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return null;
        const user = await res.json() as { id: string; username: string; avatar: string | null };
        return {
            id:       user.id,
            username: user.username,
            avatarUrl: user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : null,
        };
    } catch (err) {
        logger.warn('Discord identity request failed', { err });
        return null;
    }
}

/** Best-effort: a disconnect must proceed (and the stored connection must be
 * deleted) even if Discord's own revocation call fails or times out. */
export async function revokeDiscordToken(token: string): Promise<void> {
    try {
        await fetch('https://discord.com/api/oauth2/token/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, token }),
        });
    } catch (err) {
        logger.warn('Discord token revocation failed (ignored, disconnect proceeds anyway)', { err });
    }
}
