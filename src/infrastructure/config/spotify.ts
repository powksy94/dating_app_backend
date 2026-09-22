import { logger } from './logger.js';

const clientId     = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    logger.warn('SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET manquant(s) — la recherche de groupes est désactivée, les pastilles restent en saisie libre.');
}

/** True once both Spotify credentials are set. The rest of the backend keeps
 * working without them: band search falls back to plain free-text pills,
 * which is the intended behavior, not a degraded one (see dev_features/
 * conversation-starters.md, §2 "Import des groupes"). */
export const spotifyConfigured = Boolean(clientId && clientSecret);

interface CachedToken { value: string; expiresAt: number }
let cached: CachedToken | null = null;

// Client-credentials flow: this only ever reads public catalog data (artist
// search), never acts on behalf of a Spotify user, so no user login is needed.
// This makes the integration a "Non-Streaming" app under Spotify's developer
// policy (metadata only, no audio playback), which is the category allowed to
// sit inside a paid product like a subscription dating app.
async function requestToken(): Promise<CachedToken> {
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
    const data = await res.json() as { access_token: string; expires_in: number };
    // A minute of margin, so a token never expires mid-request.
    return { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
}

/** A valid access token, or null when Spotify isn't configured or the request
 * failed. Callers must treat null as "fall back to free text", never as an error. */
export async function getSpotifyToken(): Promise<string | null> {
    if (!spotifyConfigured) return null;
    if (cached && Date.now() < cached.expiresAt) return cached.value;
    try {
        cached = await requestToken();
        return cached.value;
    } catch (err) {
        logger.warn('Spotify token request failed, falling back to free-text bands', { err });
        return null;
    }
}
