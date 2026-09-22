import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { getSpotifyToken, spotifyConfigured } from '../../infrastructure/config/spotify.js';

export interface BandSearchResult {
    id:       string;
    name:     string;
    imageUrl: string | null;
}

const MAX_RESULTS = 8;
// Below this length a query matches too many artists to be useful, and only
// costs an API call for nothing while the user is still typing.
const MIN_QUERY_LENGTH = 2;

interface SpotifyArtist {
    id:     string;
    name:   string;
    images: { url: string }[];
}

/**
 * Searches Spotify's artist catalog so a user can pick a favorite band with its
 * photo. `available: false` means Spotify isn't configured or didn't respond:
 * the app must fall back to a plain text pill, not show an error (see
 * dev_features/conversation-starters.md, §2). Every response that reaches the
 * app must carry Spotify's attribution per their developer policy: the app
 * shows the `poweredBy` mark next to a result picked from `results`.
 */
export async function searchBands(req: AuthRequest, res: Response): Promise<void> {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!spotifyConfigured) { res.json({ available: false, results: [] }); return; }
    if (query.length < MIN_QUERY_LENGTH) { res.json({ available: true, results: [] }); return; }

    const token = await getSpotifyToken();
    if (!token) { res.json({ available: false, results: [] }); return; }

    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('type', 'artist');
    url.searchParams.set('limit', String(MAX_RESULTS));
    url.searchParams.set('q', query);

    try {
        const spotifyRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!spotifyRes.ok) { res.json({ available: false, results: [] }); return; }

        const data = await spotifyRes.json() as { artists?: { items?: SpotifyArtist[] } };
        const results: BandSearchResult[] = (data.artists?.items ?? []).map((artist) => ({
            id:   artist.id,
            name: artist.name,
            // Spotify orders images largest first; the smallest is plenty for a
            // small round avatar in a pill, and saves bandwidth on the search list.
            imageUrl: artist.images.at(-1)?.url ?? null,
        }));
        res.json({ available: true, results, poweredBy: 'Spotify' });
    } catch {
        res.json({ available: false, results: [] });
    }
}
