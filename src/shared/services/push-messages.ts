/** Every text the server puts in a push notification, in one language. */
interface PushTexts {
    newMatchTitle:   string;
    newMatchBody:    (username: string) => string;
    someone:         string;
    newElegyTitle:   string;
    newElegyBody:    (username: string) => string;
    newMessage:      string;
    photo:           string;
    reportTitle:     string;
    eventTitle:      string;
    adminAuthTitle:  string;
    adminAuthBody:   string;
}

const fr: PushTexts = {
    newMatchTitle:  '🖤 Nouveau match !',
    newMatchBody:   (username) => `Tu as matché avec ${username}`,
    someone:        'quelqu\'un',
    newElegyTitle:  '✉️ Nouvelle élégie',
    newElegyBody:   (username) => `${username} t'a envoyé une élégie`,
    newMessage:     'Nouveau message',
    photo:          '📷 Photo',
    reportTitle:    '🚩 Signalement à traiter',
    eventTitle:     '📋 Évènement à valider',
    adminAuthTitle: '🔐 Connexion admin',
    adminAuthBody:  'Demande de connexion au panel admin. Approuves-tu ?',
};

const en: PushTexts = {
    newMatchTitle:  '🖤 New match!',
    newMatchBody:   (username) => `You matched with ${username}`,
    someone:        'someone',
    newElegyTitle:  '✉️ New elegy',
    newElegyBody:   (username) => `${username} sent you an elegy`,
    newMessage:     'New message',
    photo:          '📷 Photo',
    reportTitle:    '🚩 Report to review',
    eventTitle:     '📋 Event to review',
    adminAuthTitle: '🔐 Admin login',
    adminAuthBody:  'Admin panel login request. Do you approve?',
};

// To support a new language, add its texts above and list it here: the user
// model and the push-token endpoint both derive their allowed values from it.
const CATALOG = { fr, en } satisfies Record<string, PushTexts>;

export type PushLocale = keyof typeof CATALOG;
export const PUSH_LOCALES = Object.keys(CATALOG) as PushLocale[];

export function isPushLocale(value: unknown): value is PushLocale {
    return typeof value === 'string' && (PUSH_LOCALES as string[]).includes(value);
}

/** The push texts for a user's language. Anything unknown falls back to French,
 * which is what every notification used before languages were tracked. */
export function pushTexts(locale: string | undefined): PushTexts {
    return isPushLocale(locale) ? CATALOG[locale] : fr;
}
