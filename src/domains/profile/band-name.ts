import { containsBannedWord } from '../../shared/data/banned-words.js';
import { containsProfanity, THEME_WORDS } from '../../shared/data/profanity.js';
import { getSpotifyArtist } from '../../infrastructure/config/spotify.js';

/** A favorite band as stored on a profile. `imageUrl`/`spotifyId` are only
 * present for a band picked from Spotify search; a plain typed name has neither. */
export interface FavoriteBand {
    name:       string;
    imageUrl?:  string;
    spotifyId?: string;
}

export const MAX_FAVORITE_BANDS = 20;
// The app caps the input at 60 characters; the server is a little more lenient
// because clients do not count characters exactly like JavaScript does.
export const MAX_BAND_NAME_LENGTH = 80;

// A band name ends up in messages sent under another user's name, so links and
// handles are refused.
const LINK_PATTERN = /(https?:|www\.|:\/\/|@)/i;

const ACCENT_FOLDING: Record<string, string> = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
    'ç': 'c',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ñ': 'n',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'œ': 'oe', 'æ': 'ae', 'ß': 'ss',
};

/**
 * Comparison key for a band name. Case, accents, punctuation, repeated spaces
 * and a leading "the" are ignored ("The Cure", "the  cure" and "Cure" give the
 * same key). Must stay identical to bandKey in the app (lib/core/band_name.dart).
 */
export function bandKey(name: string): string {
    let folded = '';
    for (const char of name.toLowerCase()) folded += ACCENT_FOLDING[char] ?? char;
    let key = folded
        .replace(/\p{Mn}/gu, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (key.startsWith('the ')) key = key.slice(4);
    return key;
}

/** Trims, collapses whitespace and drops control characters. Null when unusable. */
export function cleanBandName(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length > MAX_BAND_NAME_LENGTH || !bandKey(cleaned)) return null;
    return cleaned;
}

export type BandNameVerdict = 'ok' | 'invalid' | 'link' | 'banned';

export function checkBandName(raw: unknown): { verdict: BandNameVerdict; name?: string } {
    const name = cleanBandName(raw);
    if (!name) return { verdict: 'invalid' };
    if (LINK_PATTERN.test(name)) return { verdict: 'link' };
    // Same rule as the app: the multilingual lists, with the dark-theme words
    // (Sex Pistols, Killing Joke...) allowed in a band name.
    if (containsBannedWord(name) || containsProfanity(name, THEME_WORDS)) return { verdict: 'banned' };
    return { verdict: 'ok', name };
}

// A legacy profile predates favorite bands having images: its favoriteBands is
// a plain string array (see migrate-favorite-bands.ts, which upgrades stored
// documents to objects, and this fallback for whatever it hasn't reached yet).
function rawEntryToInput(item: unknown): { name: unknown; spotifyId: unknown } {
    if (typeof item === 'string') return { name: item, spotifyId: undefined };
    const entry = item as { name?: unknown; spotifyId?: unknown } | null;
    return { name: entry?.name, spotifyId: entry?.spotifyId };
}

/**
 * Cleans a favorite bands list: keeps only acceptable names, removes duplicates
 * (same band whatever the case or spacing) and caps the count. Returns null
 * when the value is not a list, so the caller can leave the stored value alone.
 *
 * A client can only ever pick a Spotify artist by its id, taken from a search
 * result; it never gets to declare that id's name or image itself. When
 * `spotifyId` is present, this re-fetches that artist from Spotify and uses
 * its name and image, ignoring whatever name the client sent for it (the same
 * "the server decides, the client only points" rule as the pseudo and photo
 * checks). If Spotify can't confirm the id (rate-limited, deleted, disabled),
 * the entry falls back to plain free text instead of being dropped.
 */
export async function sanitizeFavoriteBands(raw: unknown): Promise<FavoriteBand[] | null> {
    if (!Array.isArray(raw)) return null;
    const seen = new Set<string>();
    const bands: FavoriteBand[] = [];

    for (const item of raw) {
        if (bands.length === MAX_FAVORITE_BANDS) break;
        const { name: rawName, spotifyId } = rawEntryToInput(item);

        let band: FavoriteBand | null = null;
        if (typeof spotifyId === 'string' && spotifyId) {
            const artist = await getSpotifyArtist(spotifyId);
            if (artist) {
                const { verdict, name } = checkBandName(artist.name);
                if (verdict === 'ok' && name) {
                    band = { name, spotifyId, imageUrl: artist.imageUrl ?? undefined };
                }
            }
        }
        if (!band) {
            const { verdict, name } = checkBandName(rawName);
            if (verdict !== 'ok' || !name) continue;
            band = { name };
        }

        const key = bandKey(band.name);
        if (seen.has(key)) continue;
        seen.add(key);
        bands.push(band);
    }
    return bands;
}
