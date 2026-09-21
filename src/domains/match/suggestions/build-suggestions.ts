import { bandKey, checkBandName } from '../../profile/band-name.js';
import { TagFrequency } from './tag-frequency.js';
import {
    TAG_FIELDS, TagField, VOCABULARY, TEMPLATES_BY_FIELD, FORMAT_TEMPLATES, SENSITIVE_VIBES, pickTemplate,
} from './suggestion-templates.js';

/**
 * One conversation starter, as structure only. `hook` is the banner id and `message`
 * the message id; the app writes both texts in the user's language from the values.
 */
export interface Suggestion {
    hook:     string;
    message:  string;
    tag?:     string;
    tag2?:    string;
    band?:    string;
    event?:   string;
}

/** Where the suggestions come from; "none" means the app falls back to classic icebreakers. */
export type SuggestionSource = 'common' | 'other_band' | 'none';

export interface SuggestionsResult {
    /** False when the two profiles share nothing: the app shows its reassurance dialog. */
    hasCommon:   boolean;
    source:      SuggestionSource;
    suggestions: Suggestion[];
}

export type SuggestionProfile = Record<TagField, string[]> & { favoriteBands: string[] };

export interface SuggestionInput {
    /** The person who will see the suggestions (the sender of the chosen message). */
    me:          SuggestionProfile;
    other:       SuggestionProfile;
    frequency:   TagFrequency;
    /** Title of an upcoming event both attend, if any. */
    commonEvent: string | null;
    /** The match id: it picks the phrasing, so a match always shows the same ones. */
    seed:        string;
    /** How many suggestions the viewer's plan allows. */
    limit:       number;
}

// Below this many profiles, a share is noise: rarity is then ignored altogether.
const MIN_SAMPLE = 30;
// A tag this widespread only fills the list when nothing better remains.
const COMMON_SHARE = 0.35;
// The word "rare" is only written for a tag at most this widespread.
const RARE_SHARE = 0.10;
const MAX_BAND_SUGGESTIONS = 2;

interface SharedTag { field: TagField; tag: string; share: number; rare: boolean }

// A name ends up in a message sent under someone else's name: no link, no handle,
// no insult, no line break (the same checks as when a profile is saved).
function insertable(text: string): string | null {
    const { verdict, name } = checkBandName(text);
    return verdict === 'ok' && name ? name : null;
}

// Favorite bands both have, in the spelling of the person who sees the suggestion.
function commonBands(me: SuggestionProfile, other: SuggestionProfile): string[] {
    const theirs = new Set(other.favoriteBands.map(bandKey));
    const seen   = new Set<string>();
    const bands: string[] = [];
    for (const band of me.favoriteBands) {
        const key = bandKey(band);
        const safe = insertable(band);
        if (!safe || !theirs.has(key) || seen.has(key)) continue;
        seen.add(key);
        bands.push(safe);
    }
    return bands;
}

function sharedTags(me: SuggestionProfile, other: SuggestionProfile, frequency: TagFrequency): SharedTag[] {
    const reliable = frequency.total >= MIN_SAMPLE;
    const shared: SharedTag[] = [];
    for (const field of TAG_FIELDS) {
        for (const tag of new Set(me[field])) {
            if (!VOCABULARY[field].includes(tag) || !other[field].includes(tag)) continue;
            const share = reliable ? frequency.share(tag) : 0;
            shared.push({ field, tag, share, rare: reliable && share <= RARE_SHARE });
        }
    }
    return shared;
}

// The rarest tag of each category first, then a second round, and so on: the
// suggestions cover different categories before repeating one.
function roundRobin(tags: SharedTag[]): SharedTag[] {
    const byField = new Map<TagField, SharedTag[]>();
    for (const item of [...tags].sort((a, b) => a.share - b.share)) {
        byField.set(item.field, [...(byField.get(item.field) ?? []), item]);
    }
    const ordered: SharedTag[] = [];
    for (let round = 0; ; round++) {
        const layer = [...byField.values()]
            .map((list) => list[round])
            .filter((item): item is SharedTag => item !== undefined)
            .sort((a, b) => a.share - b.share);
        if (layer.length === 0) return ordered;
        ordered.push(...layer);
    }
}

// Widespread tags (goth, concerts...) come after every tag that says more.
function orderTags(tags: SharedTag[]): SharedTag[] {
    return [
        ...roundRobin(tags.filter((item) => item.share < COMMON_SHARE)),
        ...roundRobin(tags.filter((item) => item.share >= COMMON_SHARE)),
    ];
}

const isSensitive = (item: SharedTag) => item.field === 'musicsVibes' && SENSITIVE_VIBES.includes(item.tag);

function tagSuggestion(item: SharedTag, seed: string, used: ReadonlySet<string>): Suggestion | null {
    if (isSensitive(item)) return { hook: 'hook_mood', message: 'vibe_sensitive' };
    const message = item.field === 'discoveryFormats'
        ? FORMAT_TEMPLATES[item.tag]
        : pickTemplate(TEMPLATES_BY_FIELD[item.field], `${seed}:${item.tag}`, used);
    if (!message) return null;
    return { hook: item.rare ? 'hook_rare' : 'hook_shared', message, tag: item.tag };
}

// Two tags from different categories in one sentence: only worth it once the
// single-tag suggestions are used up, so it comes last.
function comboSuggestion(tags: SharedTag[]): Suggestion | null {
    const usable = tags.filter((item) => !isSensitive(item));
    const first  = usable[0];
    const second = usable.find((item) => item.field !== first?.field);
    return first && second ? { hook: 'hook_combo', message: 'combo_1', tag: first.tag, tag2: second.tag } : null;
}

/**
 * The conversation starters for two people who just matched. Priority, from the most
 * concrete to the most general: an event both attend, a favorite band both like, then
 * shared tags. With nothing in common, a favorite band of the other person.
 */
export function buildSuggestions(input: SuggestionInput): SuggestionsResult {
    const { me, other, frequency, commonEvent, seed, limit } = input;

    const candidates: Suggestion[] = [];
    const seen = new Set<string>();
    const add = (suggestion: Suggestion | null) => {
        if (!suggestion) return;
        const key = `${suggestion.message}|${suggestion.tag ?? ''}|${suggestion.band ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push(suggestion);
    };

    const event = commonEvent ? insertable(commonEvent) : null;
    if (event) add({ hook: 'hook_event', message: 'event_1', event });
    for (const band of commonBands(me, other).slice(0, MAX_BAND_SUGGESTIONS)) {
        add({ hook: 'hook_band', message: 'band_1', band });
    }
    const tags = orderTags(sharedTags(me, other, frequency));
    for (const item of tags) {
        add(tagSuggestion(item, seed, new Set(candidates.map((candidate) => candidate.message))));
    }
    add(comboSuggestion(tags));

    if (candidates.length > 0) {
        return { hasCommon: true, source: 'common', suggestions: candidates.slice(0, limit) };
    }

    for (const band of other.favoriteBands) {
        const safe = insertable(band);
        if (safe) {
            return {
                hasCommon: false,
                source: 'other_band',
                suggestions: [{ hook: 'hook_other_band', message: 'other_band_1', band: safe }],
            };
        }
    }
    return { hasCommon: false, source: 'none', suggestions: [] };
}
