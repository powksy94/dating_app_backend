import { IProfile } from "../../profile/profile.model.js";

// Each bracket's upper bound (inclusive); the last one has no ceiling.
const BRACKETS: { max: number; label: string}[] = [
    { max: 17,          label: 'Moins de 18' },
    { max: 24,          label: '18-24' },
    { max: 34,          label: '25-34' },
    { max: 44,          label: '35-44' },
    { max: 54,          label: '45-54' },
    { max: Infinity,    label: '55+'},
];

const UNKNOWN_AGE = 'Non renseigné';
export const AGE_BRACKETS_ORDER = [...BRACKETS.map((b) => b.label), UNKNOWN_AGE];

// Same calculation as profile-validation.ts's validateBirthDate.
function ageFromBirthDate(birthDate: Date, now: Date): number {
    let age = now.getFullYear() - birthDate.getFullYear();
    const hadBirthday = now.getMonth() > birthDate.getMonth()
        || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
    if (!hadBirthday) age--;
    return age;
}

/** The age bracket for a profile: from birthDate when present (the
 * authoritative source), falling back to the legacy `age` field, and
 * "Non renseigné" when neither is set. */
export function ageBracketOf(
    profile: Pick<IProfile, 'birthDate' | 'age'>,
    now: Date = new Date(),
): string {
    const age = profile.birthDate ? ageFromBirthDate(profile.birthDate, now) : profile.age;
    if (age === undefined) return UNKNOWN_AGE;
    return BRACKETS.find((b) => age <= b.max)!.label;
}