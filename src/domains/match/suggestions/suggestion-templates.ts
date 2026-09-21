import {
    MUSIC_GENRES, MUSIC_VIBES, AESTHETICS, SOUND_INTENSITY, MUSIC_ERAS, DISCOVERY_FORMATS,
} from '../../profile/profile-vocabulary.js';

// The bank of conversation starters (dev_features/conversation-starters.md, section 4).
// The server never writes a sentence: it only picks template ids. The app owns the
// texts (app_fr.arb / app_en.arb) and builds them from these ids and their values.

export type TagField =
    | 'musicsGenres' | 'musicsVibes' | 'aesthetics'
    | 'soundIntensity' | 'musicEras' | 'discoveryFormats';

export const TAG_FIELDS: TagField[] = [
    'musicsGenres', 'musicsVibes', 'aesthetics', 'soundIntensity', 'musicEras', 'discoveryFormats',
];

/** Closed vocabulary of each field: a tag outside it is never put in a message. */
export const VOCABULARY: Record<TagField, readonly string[]> = {
    musicsGenres:     MUSIC_GENRES,
    musicsVibes:      MUSIC_VIBES,
    aesthetics:       AESTHETICS,
    soundIntensity:   SOUND_INTENSITY,
    musicEras:        MUSIC_ERAS,
    discoveryFormats: DISCOVERY_FORMATS,
};

/** Message templates of a category. Several ones let two matches get different phrases. */
export const TEMPLATES_BY_FIELD: Record<TagField, readonly string[]> = {
    musicsGenres:     ['genre_1', 'genre_2', 'genre_3'],
    musicsVibes:      ['vibe_1', 'vibe_2'],
    aesthetics:       ['aesthetic_1'],
    soundIntensity:   ['intensity_1'],
    musicEras:        ['era_1'],
    // The five discovery formats are so few that each one has its own template.
    discoveryFormats: [],
};

export const FORMAT_TEMPLATES: Record<string, string> = {
    'concerts':            'format_concerts',
    'vinyl collector':     'format_vinyl',
    'bandcamp digger':     'format_bandcamp',
    'playlist explorer':   'format_playlist',
    'underground scenes':  'format_underground',
};

/** Too heavy for a light sentence: they use the neutral template that names no tag. */
export const SENSITIVE_VIBES: readonly string[] = ['depressive', 'angry'];

/** FNV-1a: a small stable hash, so the same match always gets the same phrases. */
function hash(text: string): number {
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, 0x01000193);
    }
    return value >>> 0;
}

/** A template of the category, chosen from the seed. Templates already used in the
 * same list are avoided while another one is left, so no question is asked twice. */
export function pickTemplate(templates: readonly string[], seed: string, used: ReadonlySet<string> = new Set()): string | null {
    if (templates.length === 0) return null;
    const free = templates.filter((template) => !used.has(template));
    const pool = free.length > 0 ? free : templates;
    return pool[hash(seed) % pool.length]!;
}
