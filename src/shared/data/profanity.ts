import { readFileSync } from 'fs';

// Same word lists and same detection as the app's safe_text package, so the
// server judges a text like the app does. The lists are in profanity-words.json
// (English and French).
interface WordLists {
    en: string[];
    fr: string[];
}
const lists = JSON.parse(
    readFileSync(new URL('./profanity-words.json', import.meta.url), 'utf-8'),
) as WordLists;

// Leet-speak conversion, identical to safe_text: "n4zi" is read as "nazi".
const LEET: Record<string, string> = {
    '@': 'a', '4': 'a', '8': 'b', '(': 'c', '3': 'e', '1': 'i', '!': 'i',
    '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't', 'v': 'u', '#': 'h',
};

function normalize(text: string): string {
    let converted = '';
    for (const char of text.toLowerCase()) converted += LEET[char] ?? char;
    return converted;
}

// A list word that contains a converted character (a digit, "v", "$"...) can
// never be found in the converted text, so it is left out. Same result as
// safe_text, but faster.
const WORDS: string[] = [...new Set([...lists.en, ...lists.fr].map((word) => word.toLowerCase()))]
    .filter((word) => word.length > 0 && ![...word].some((char) => char in LEET));

// Words that appear in the profanity lists but are everyday material in dark
// music band names and profiles (Sex Pistols, Killing Joke, Massive Attack...).
// They are themes, not insults: allowed in a band name or a bio, never in a
// username. Keep in sync with app_rencontre/lib/core/band_moderation.dart.
export const THEME_WORDS: ReadonlySet<string> = new Set([
    'sex', 'suicide', 'kill', 'killing', 'attack', 'assassin',
    'pistol', 'sodom', 'christ', 'napalm', 'damned', 'bloody',
]);

const isAlphanumeric = (codePoint: number): boolean =>
    /[\p{L}\p{N}]/u.test(String.fromCodePoint(codePoint));

function codePointBefore(text: string, index: number): number {
    const last = text.charCodeAt(index - 1);
    const isLowSurrogate = last >= 0xDC00 && last <= 0xDFFF;
    if (isLowSurrogate && index >= 2) {
        const first = text.charCodeAt(index - 2);
        if (first >= 0xD800 && first <= 0xDBFF) return text.codePointAt(index - 2)!;
    }
    return last;
}

// A match counts only as a whole word: the characters around it are not
// letters or digits.
function isWholeWord(text: string, start: number, end: number): boolean {
    if (start > 0 && isAlphanumeric(codePointBefore(text, start))) return false;
    if (end < text.length && isAlphanumeric(text.codePointAt(end)!)) return false;
    return true;
}

/** True when [text] contains an insult, in English or French, as a whole word. */
export function containsProfanity(text: string, allowedWords: ReadonlySet<string> = new Set()): boolean {
    const normalized = normalize(text);
    for (const word of WORDS) {
        if (allowedWords.has(word)) continue;
        let from = 0;
        for (;;) {
            const at = normalized.indexOf(word, from);
            if (at === -1) break;
            if (isWholeWord(normalized, at, at + word.length)) return true;
            from = at + 1;
        }
    }
    return false;
}
