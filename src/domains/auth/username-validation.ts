import { Profile } from '../profile/profile.model.js';
import { containsBannedWord } from '../../shared/data/banned-words.js';
import { containsProfanity } from '../../shared/data/profanity.js';

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

export interface UsernameProblem {
    reason: string;
    /** True when the username is well formed but already used. */
    taken: boolean;
}

/**
 * Why a username cannot be used, or null when it can. Shared by check-username
 * (advice while typing) and register (the real enforcement: a client that skips
 * check-username must not get a different result).
 */
export async function usernameProblem(username: unknown): Promise<UsernameProblem | null> {
    if (typeof username !== 'string' || username.trim().length < MIN_LENGTH) {
        return { reason: 'Too short (3 characters minimum)', taken: false };
    }
    if (username.length > MAX_LENGTH) {
        return { reason: 'Too long (20 characters maximum)', taken: false };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        return { reason: 'Invalid characters', taken: false };
    }
    // Direct block, with no exception for dark-theme words: the old short list
    // and the multilingual lists (same as the app's safe_text).
    if (containsBannedWord(username) || containsProfanity(username)) {
        return { reason: 'Username not allowed', taken: false };
    }
    // Case-insensitive, so "Alice" and "alice" cannot both exist.
    const existing = await Profile.findOne({ username }).collation({ locale: 'en', strength: 2 });
    if (existing) return { reason: 'Username already taken', taken: true };
    return null;
}
