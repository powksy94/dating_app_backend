export const MAX_PHOTOS = 6;

// Photos are uploaded through POST /profile/photos, which stores them in this
// Cloudinary folder.
const PHOTO_FOLDER = '/nocturne/profiles/';

/**
 * A profile photo list: at most 6 https links to images of our own Cloudinary
 * account and folder, without duplicates. Anything else (external links, other
 * accounts) is dropped, so a profile cannot display arbitrary remote content.
 * Returns undefined when the value is not a list or Cloudinary is not configured.
 */
export function validatePhotos(value: unknown): string[] | undefined {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !Array.isArray(value)) return undefined;

    const prefix = `https://res.cloudinary.com/${cloudName}/`;
    const photos = value.filter((url): url is string =>
        typeof url === 'string' && url.startsWith(prefix) && url.includes(PHOTO_FOLDER));
    return [...new Set(photos)].slice(0, MAX_PHOTOS);
}
