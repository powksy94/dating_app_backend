import { containsBannedWord } from '../../shared/data/banned-words.js';
import { containsProfanity, THEME_WORDS } from '../../shared/data/profanity.js';

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

/**
 * Cleans a favorite bands list: keeps only acceptable names, removes duplicates
 * (same band whatever the case or spacing) and caps the count. Returns null
 * when the value is not a list, so the caller can leave the stored value alone.
 */
export function sanitizeBandList(raw: unknown): string[] | null {
    if (!Array.isArray(raw)) return null;
    const seen = new Set<string>();
    const bands: string[] = [];
    for (const item of raw) {
        const { verdict, name } = checkBandName(item);
        if (verdict !== 'ok' || !name) continue;
        const key = bandKey(name);
        if (seen.has(key)) continue;
        seen.add(key);
        bands.push(name);
        if (bands.length === MAX_FAVORITE_BANDS) break;
    }
    return bands;
}
