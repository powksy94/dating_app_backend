import { iso1A2Code } from "@rapideditor/country-coder";

export const UNKNOWN_COUNTRY = 'Non renseigné';

const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });

/** The French country name for a profile's location, from its coordinates
 * (offline, via country-coder) — UNKNOWN_COUNTRY when there's no location,
 * the point is in open water (iso1A2Code returns null), or it's an
 * unset placeholder [0, 0]. */
export function countryOf(location?: { coordinates: [number, number] }): string {
    if (!location) return UNKNOWN_COUNTRY;
    const [lng, lat] = location.coordinates;
    if (lng === 0 && lat === 0) return UNKNOWN_COUNTRY;

    const code = iso1A2Code([lng, lat]);
    if (!code) return UNKNOWN_COUNTRY;

    return regionNames.of(code) ?? UNKNOWN_COUNTRY;
}