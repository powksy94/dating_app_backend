// A profile link (Discord, Bandcamp, Spotify...) is a plain web URL, opened in
// the browser if the corresponding app is not installed (same as most dating
// apps): no OAuth, no app-to-app deep link scheme, no dependency on any app
// being present on the viewer's phone.
//
// The platform is never taken from what the client claims: it is derived here,
// server-side, from the URL's own domain. A client cannot label an arbitrary
// link as a trusted platform.
export const SOCIAL_PLATFORM_HOSTS: Record<string, string[]> = {
    spotify:   ['open.spotify.com', 'spotify.com'],
    instagram: ['instagram.com', 'www.instagram.com'],
    bandcamp:  ['bandcamp.com'],
    lastfm:    ['last.fm', 'www.last.fm'],
    tumblr:    ['tumblr.com'],
    // Discord has no universal "view my profile" page the way the others do;
    // what ends up here is usually a server invite (discord.gg/...), not a
    // personal profile. Accepted as-is, that limitation is Discord's, not ours.
    discord:   ['discord.com', 'discord.gg'],
};

function hostMatches(hostname: string, allowed: string[]): boolean {
    return allowed.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

/** The platform a URL belongs to (its own domain decides), or null. */
export function detectPlatform(value: string): string | null {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:') return null;
    for (const [platform, hosts] of Object.entries(SOCIAL_PLATFORM_HOSTS)) {
        if (hostMatches(url.hostname, hosts)) return platform;
    }
    return null;
}

/**
 * Cleans a profile's links: every value is re-keyed by the platform its own
 * URL actually points to, so a client can never mislabel one. A value that
 * matches no known platform is dropped rather than failing the whole update,
 * the same way an unusable favorite band is dropped (see band-name.ts).
 * Undefined only for a malformed request body, never for "no links".
 */
export function sanitizeSocialLinks(raw: unknown): Record<string, string> | undefined {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
    const links: Record<string, string> = {};
    for (const value of Object.values(raw as Record<string, unknown>)) {
        if (typeof value !== 'string') continue;
        const platform = detectPlatform(value);
        if (platform) links[platform] = value;
    }
    return links;
}
