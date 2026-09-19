// Links and phone numbers are refused in the first messages of a conversation:
// it is the usual way a scam or a spammer takes the victim out of the app.
// Detection only; when it applies is decided in contact-guard.ts.

// Web addresses: a scheme, "www.", the Telegram short link, or a word followed
// by a common domain ending ("site.com", "wa.me"). The ending must not be
// followed by a letter, so "salut.comment" is not taken for a link.
const LINK_PATTERNS: RegExp[] = [
    /https?:/i,
    /www\./i,
    /(?<![\p{L}\p{N}])t\.me[/]/iu,
    /[a-z0-9-]{2,}\.(?:com|net|org|fr|io|me|ly|app|xyz|co|info|be|ch|de|uk|us|ca|tv|gg|link|click|top|site|online|shop|ru|cn|cc|to|ws)(?![\p{L}\p{N}])/iu,
];

// At least 9 digits in a row, possibly split by single spaces, dots or dashes
// ("0612345678", "06 12 34 56 78", "+33 6-12-34-56-78").
const PHONE_CANDIDATE = /\+?\d(?:[ .-]?\d){8,}/g;

function containsPhoneNumber(text: string): boolean {
    const cleaned = text.replace(/[()]/g, '');
    for (const match of cleaned.matchAll(PHONE_CANDIDATE)) {
        // A "+" followed by digits is an international number, whatever its
        // formatting ("+1 415-555-2671").
        if (match[0].startsWith('+')) return true;
        // Otherwise a phone number uses one kind of separator. A date followed by
        // a time ("12.03.24 10.30") mixes two, so it is not taken for a number.
        const separators = new Set(match[0].replace(/\d/g, ''));
        if (separators.size <= 1) return true;
    }
    return false;
}

/** True when [text] contains a web address or a phone number. */
export function containsContactInfo(text: unknown): boolean {
    if (typeof text !== 'string' || text.length === 0) return false;
    return LINK_PATTERNS.some((pattern) => pattern.test(text)) || containsPhoneNumber(text);
}
