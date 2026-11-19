import { Request, Response } from "express";
import { Profile } from "../../profile/profile.model.js"
import { countBy } from "./count-by.js";
import { keepTopSlices } from "./top-slices.js";
import { ageBracketOf, AGE_BRACKETS_ORDER } from "./age-brackets.js";
import { countryOf, UNKNOWN_COUNTRY } from "./country-of.js";
import { NOT_TEST_ACCOUNT, MongoFilter } from "./real-accounts-filter.js";
import { parsePeriod, type Period } from "./period.js";

const COUNTRY_TOP_LIMIT     = 8;
const OTHER_COUNTRIES_LABEL = 'Autres pays';
const DAY_MS = 24 * 60 * 60 * 1000;

// Should never be non-empty — validateBirthDate (profile-validation.ts)
// already refuses any age under 18 at signup and on every profile update.
// Kept as a visible anomaly signal rather than silently dropped or folded
// into "18-24": if it's ever non-zero, that's a real problem to investigate
// (corrupted data, a direct database edit...), not a normal data point.
// AGE_BRACKET_ORDER[0] is always this bracket — see age-brackets.ts's BRACKETS.
const UNDERAGE_BRACKET = AGE_BRACKETS_ORDER[0];

export async function getProfileDemographics(req: Request, res: Response): Promise<void> {
    // No days parameter means the whole base, as before periods existed;
    // an invalid value still falls back to parsePeriod's default.
    const period: Period = req.query.days === undefined ? 'all' : parsePeriod(req.query.days);
    const filter: MongoFilter = period === 'all'
        ? NOT_TEST_ACCOUNT
        : { ...NOT_TEST_ACCOUNT, createdAt: { $gte: new Date(Date.now() - period * DAY_MS) } };

    // Only what's needed to bucket by age and country — nothing identifying
    // ever leaves the database; the response is aggregated counts only.
    const profiles = await Profile.find(
        filter,
        { birthDate: 1, age: 1, location: 1, _id: 0 },
    ).lean();

    const now = new Date();
    const ages = countBy(profiles, (p) => ageBracketOf(p, now), AGE_BRACKETS_ORDER)
        .map((slice) => slice.label === UNDERAGE_BRACKET ? { ...slice, warning: true } : slice);
    
    const countrySlices = countBy(profiles, (p) => countryOf(p.location));
    const countries     = keepTopSlices(countrySlices, COUNTRY_TOP_LIMIT, OTHER_COUNTRIES_LABEL, [UNKNOWN_COUNTRY]);

    res.json({ ages, countries})
}