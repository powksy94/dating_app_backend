export type Plan = 'ombre' | 'nocturne' | 'abyssal';

export const PLAN_LIMITS = {
    swipesPerDay:    { ombre: 30,    nocturne: Infinity, abyssal: Infinity },
    elegiesPerMonth: { ombre: 3,     nocturne: 15,       abyssal: Infinity },
    eventsPerMonth:  { ombre: 2,     nocturne: 4,        abyssal: Infinity },
    whoLikedMe:      { ombre: false, nocturne: true,     abyssal: true },
    whoVisitedMe:    { ombre: false, nocturne: true,     abyssal: true },
    rewind:          { ombre: false, nocturne: true,     abyssal: true },
    photosVisible:   { ombre: 2,     nocturne: 6,        abyssal: 6 },
} as const;

export const BOOST_LIMITS: Record<Plan, { credits: number; period: 'month' | 'week' | null }> = {
    ombre:    { credits: 0, period: null    },
    nocturne: { credits: 1, period: 'month' },
    abyssal:  { credits: 1, period: 'week'  },
};

export const todayStr = (): string => new Date().toISOString().slice(0, 10);
export const monthStr = (): string => new Date().toISOString().slice(0, 7);

export function mondayThisWeek(): Date {
    const now  = new Date();
    const diff = (now.getDay() === 0 ? -6 : 1 - now.getDay());
    const mon  = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
}
