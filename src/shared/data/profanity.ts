import { readFileSync } from 'fs';
import { franc } from 'franc';

// Same word lists and same detection as the app's safe_text package, so the
// server judges a text like the app does. The lists are in profanity-words.json
// (English and French).
//
// To add a language: add its list here and in profanity-words.json, and add
// its franc (ISO 639-3) code to LANG_CODES below.
interface WordLists {
    en: string[];
    fr: string[];
}
const lists = JSON.parse(
    readFileSync(new URL('./profanity-words.json', import.meta.url), 'utf-8'),
) as WordLists;

// franc's code for each language above. Keep in the same order as WordLists.
const LANG_CODES: Record<keyof WordLists, string> = {
    en: 'eng',
    fr: 'fra',
};

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
//
// Words under MIN_WORD_LENGTH are dropped entirely: this audience writes
// bios in many languages, and a 2-3 letter entry is far more likely to be an
// ordinary word in another language ("con"/"fa" in Italian, "les"/"pas"/"com"
// in French, "das"/"que" in Portuguese — all confirmed false positives) than
// an actual insult, which is almost never that short.
const MIN_WORD_LENGTH = 4;
function buildWordList(words: string[]): string[] {
    return [...new Set(words.map((word) => word.toLowerCase()))]
        .filter((word) => word.length >= MIN_WORD_LENGTH && ![...word].some((char) => char in LEET));
}

// One word list per language we have one for, keyed by franc's code, plus
// the union of all of them as a fallback. A word list is only ever checked
// against text franc detected as that same language — otherwise, a word
// that's an everyday term in some OTHER, unlisted language (the collisions
// above) never gets the chance to match in the first place.
const SUPPORTED_LANGS = Object.keys(LANG_CODES) as (keyof WordLists)[];
const WORDS_BY_LANG: Record<string, string[]> = Object.fromEntries(
    SUPPORTED_LANGS.map((key) => [LANG_CODES[key], buildWordList(lists[key])]),
);
const ALL_WORDS = buildWordList(SUPPORTED_LANGS.flatMap((key) => lists[key]));

// franc needs a few whole words to detect reliably; below that (or a language
// it doesn't recognize at all) it returns 'und' ("undetermined") — falls back
// to checking every supported language's words, same as before this
// language-aware check existed, rather than guessing wrong and either
// over- or under-filtering.
function wordsForText(text: string): string[] {
    const detected = franc(text, { minLength: 10 });
    if (detected === 'und') return ALL_WORDS;
    return WORDS_BY_LANG[detected] ?? [];
}

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

/** True when [text] contains an insult, as a whole word, in whichever
 * language it's written in (see wordsForText — a language we have no list
 * for is never checked against an unrelated one's vocabulary). */
export function containsProfanity(text: string, allowedWords: ReadonlySet<string> = new Set()): boolean {
    const normalized = normalize(text);
    for (const word of wordsForText(text)) {
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
