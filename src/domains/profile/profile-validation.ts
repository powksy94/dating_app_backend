import { sanitizeFavoriteBands } from './band-name.js';
import { validatePhotos } from './photo-urls.js';
import {
    MUSIC_GENRES, MUSIC_VIBES, AESTHETICS, SOUND_INTENSITY, MUSIC_ERAS,
    DISCOVERY_FORMATS, GENDERS, GENDER_PREFERENCES, PRONOUNS,
} from './profile-vocabulary.js';

const MAX_BIO_LENGTH = 700;
const MIN_ADULT_AGE = 18;
const MAX_BIRTH_AGE = 120;
const MAX_DISTANCE_KM = 500;

// Character codes kept in a bio among the control characters.
const TAB = 9;
const LINE_FEED = 10;

export interface ProfileUpdate {
    /** Values that passed validation, ready to be saved. */
    updates: Record<string, unknown>;
    /** Fields sent by the client but refused. "body" means the request itself. */
    rejected: string[];
}

// A validator returns the cleaned value, or undefined when the value is refused.
// Only favoriteBands is actually async (it may confirm a pick against Spotify);
// every other validator stays a plain synchronous function.
type Validator = (value: unknown) => unknown | Promise<unknown>;

const oneOf = (allowed: readonly string[]): Validator => (value) =>
    typeof value === 'string' && allowed.includes(value) ? value : undefined;

// Keeps the values that belong to the closed vocabulary, without duplicates.
const listOf = (allowed: readonly string[]): Validator => (value) => {
    if (!Array.isArray(value)) return undefined;
    const kept = value.filter((v): v is string => typeof v === 'string' && allowed.includes(v));
    return [...new Set(kept)];
};

// Only a Spotify profile link is accepted for now: socialLinks has no UI for
// any other platform, and letting a client set arbitrary key/url pairs here
// would put unverified links on a profile with no domain check at all.
const SPOTIFY_HOSTS = ['open.spotify.com', 'spotify.com'];

function isSpotifyProfileUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && SPOTIFY_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    } catch {
        return false;
    }
}

// An invalid or missing link clears the field instead of rejecting the whole
// update, the same way an unusable favorite band is dropped rather than
// failing the rest of the profile.
function validateSocialLinks(value: unknown): Record<string, string> | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const spotify = (value as Record<string, unknown>).spotify;
    return isSpotifyProfileUrl(spotify) ? { spotify } : {};
}

const numberInRange = (min: number, max: number): Validator => (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.round(Math.min(Math.max(value, min), max));
};

function validateBio(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    // Keeps line breaks and tabs, drops every other control character.
    const cleaned = value
        .replace(/\p{Cc}/gu, (char) => {
            const code = char.codePointAt(0);
            return code === TAB || code === LINE_FEED ? char : '';
        })
        .trim();
    return cleaned.slice(0, MAX_BIO_LENGTH);
}

// The app is for adults only: the app's date picker is not enough on its own.
function validateBirthDate(value: unknown): Date | undefined {
    if (typeof value !== 'string') return undefined;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return undefined;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const hadBirthday = now.getMonth() > birth.getMonth()
        || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    if (!hadBirthday) age--;
    return age >= MIN_ADULT_AGE && age <= MAX_BIRTH_AGE ? birth : undefined;
}

function validateLocation(value: unknown): { type: 'Point'; coordinates: [number, number] } | undefined {
    const location = value as { type?: unknown; coordinates?: unknown } | null;
    if (!location || location.type !== 'Point') return undefined;
    if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) return undefined;
    const [lng, lat] = location.coordinates;
    if (typeof lng !== 'number' || typeof lat !== 'number') return undefined;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return undefined;
    return { type: 'Point', coordinates: [lng, lat] };
}

// Only the fields the app really sends. username, avatarUrl, age and
// upcomingEvents are deliberately absent: the app never writes them through
// this endpoint, and letting a client set them bypassed the pseudo check
// (banned words, uniqueness) and allowed arbitrary links on a profile.
// socialLinks is narrower still: only a Spotify link goes through (see
// validateSocialLinks), everything else about it stays refused for now.
const VALIDATORS: Record<string, Validator> = {
    bio:               validateBio,
    socialLinks:       validateSocialLinks,
    gender:            oneOf(GENDERS),
    pronouns:          oneOf(PRONOUNS),
    genderPreferences: listOf(GENDER_PREFERENCES),
    musicsGenres:      listOf(MUSIC_GENRES),
    musicsVibes:       listOf(MUSIC_VIBES),
    aesthetics:        listOf(AESTHETICS),
    soundIntensity:    listOf(SOUND_INTENSITY),
    musicEras:         listOf(MUSIC_ERAS),
    discoveryFormats:  listOf(DISCOVERY_FORMATS),
    favoriteBands:     async (value) => (await sanitizeFavoriteBands(value)) ?? undefined,
    photos:            validatePhotos,
    ageMin:           numberInRange(MIN_ADULT_AGE, 99),
    ageMax:            numberInRange(MIN_ADULT_AGE, 99),
    maxDistance:       numberInRange(1, MAX_DISTANCE_KM),
    birthDate:         validateBirthDate,
    location:          validateLocation,
    profileComplete:   (value) => (typeof value === 'boolean' ? value : undefined),
};

/** Validates a profile update body and returns only what can be saved safely. */
export async function sanitizeProfileUpdate(body: unknown): Promise<ProfileUpdate> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return { updates: {}, rejected: ['body'] };
    }
    const input = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    const rejected: string[] = [];

    for (const [key, validate] of Object.entries(VALIDATORS)) {
        if (input[key] === undefined) continue;
        const cleaned = await validate(input[key]);
        if (cleaned === undefined) rejected.push(key);
        else updates[key] = cleaned;
    }

    const { ageMin, ageMax } = updates;
    if (typeof ageMin === 'number' && typeof ageMax === 'number' && ageMin > ageMax) {
        delete updates.ageMin;
        delete updates.ageMax;
        rejected.push('ageMin', 'ageMax');
    }

    // The avatar is always the first photo of the list, so the two cannot drift
    // apart (an empty list clears it). The client never sets avatarUrl itself.
    if (Array.isArray(updates.photos)) updates.avatarUrl = updates.photos[0] ?? '';

    return { updates, rejected };
}
