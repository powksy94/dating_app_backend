import { Request, Response } from "express";
import { Profile } from "../../profile/profile.model.js"
import { countBy } from "./count-by.js";
import { keepTopSlices } from "./top-slices.js";
import { ageBracketOf, AGE_BRACKETS_ORDER } from "./age-brackets.js";
import { countryOf, UNKNOWN_COUNTRY } from "./country-of.js";

const COUNTRY_TOP_LIMIT     = 8;
const OTHER_COUNTRIES_LABEL = 'Autres pays';

// Should never be non-empty — validateBirthDate (profile-validation.ts)
// already refuses any age under 18 at signup and on every profile update.
// Kept as a visible anomaly signal rather than silently dropped or folded
// into "18-24": if it's ever non-zero, that's a real problem to investigate
// (corrupted data, a direct database edit...), not a normal data point.
// AGE_BRACKET_ORDER[0] is always this bracket — see age-brackets.ts's BRACKETS.
const UNDERAGE_BRACKET = AGE_BRACKETS_ORDER[0];

export async function getProfileDemographics(_req: Request, res: Response): Promise<void> {
    // Only what's needed to bucket by age and country — nothing identifying
    // ever leaves the database; the response is aggregated counts only.
    const profiles = await Profile.find(
        { isTestAccount: false },
        { birthDate: 1, age: 1, location: 1, _id: 0 },
    ).lean();

    const now = new Date();
    const ages = countBy(profiles, (p) => ageBracketOf(p, now), AGE_BRACKETS_ORDER)
        .map((slice) => slice.label === UNDERAGE_BRACKET ? { ...slice, warning: true } : slice);
    
    const countrySlices = countBy(profiles, (p) => countryOf(p.location));
    const countries     = keepTopSlices(countrySlices, COUNTRY_TOP_LIMIT, OTHER_COUNTRIES_LABEL, [UNKNOWN_COUNTRY]);

    res.json({ ages, countries})
}