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
    reportActionedTitle: string;
    reportActionedBody:  string;
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
    reportActionedTitle: '🛡️ Signalement traité',
    reportActionedBody:  'Le compte que tu as signalé a été banni. Merci d\'avoir contribué à la sécurité de Nocturne.',
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
    reportActionedTitle: '🛡️ Report resolved',
    reportActionedBody:  'The account you reported was banned. Thanks for helping keep Nocturne safe.',
    eventTitle:     '📋 Event to review',
    adminAuthTitle: '🔐 Admin login',
    adminAuthBody:  'Admin panel login request. Do you approve?',
};

const es: PushTexts = {
    newMatchTitle:  '🖤 ¡Nuevo match!',
    newMatchBody:   (username) => `Has hecho match con ${username}`,
    someone:        'alguien',
    newElegyTitle:  '✉️ Nueva elegía',
    newElegyBody:   (username) => `${username} te ha enviado una elegía`,
    newMessage:     'Nuevo mensaje',
    photo:          '📷 Foto',
    reportTitle:    '🚩 Denuncia por gestionar',
    reportActionedTitle: '🛡️ Denuncia resuelta',
    reportActionedBody:  'La cuenta que denunciaste ha sido baneada. Gracias por ayudar a mantener Nocturne seguro.',
    eventTitle:     '📋 Evento por validar',
    adminAuthTitle: '🔐 Inicio de sesión admin',
    adminAuthBody:  'Solicitud de inicio de sesión al panel admin. ¿Apruebas?',
};

const pt: PushTexts = {
    newMatchTitle:  '🖤 Novo match!',
    newMatchBody:   (username) => `Você deu match com ${username}`,
    someone:        'alguém',
    newElegyTitle:  '✉️ Nova elegia',
    newElegyBody:   (username) => `${username} te enviou uma elegia`,
    newMessage:     'Nova mensagem',
    photo:          '📷 Foto',
    reportTitle:    '🚩 Denúncia para tratar',
    reportActionedTitle: '🛡️ Denúncia tratada',
    reportActionedBody:  'A conta que você denunciou foi banida. Obrigado por ajudar a manter o Nocturne seguro.',
    eventTitle:     '📋 Evento para validar',
    adminAuthTitle: '🔐 Login admin',
    adminAuthBody:  'Solicitação de login ao painel admin. Você aprova?',
};

const de: PushTexts = {
    newMatchTitle:  '🖤 Neues Match!',
    newMatchBody:   (username) => `Du hast ein Match mit ${username}`,
    someone:        'jemand',
    newElegyTitle:  '✉️ Neue Elegie',
    newElegyBody:   (username) => `${username} hat dir eine Elegie gesendet`,
    newMessage:     'Neue Nachricht',
    photo:          '📷 Foto',
    reportTitle:    '🚩 Meldung zu bearbeiten',
    reportActionedTitle: '🛡️ Meldung bearbeitet',
    reportActionedBody:  'Das von dir gemeldete Konto wurde gesperrt. Danke, dass du Nocturne sicherer machst.',
    eventTitle:     '📋 Veranstaltung zu prüfen',
    adminAuthTitle: '🔐 Admin-Anmeldung',
    adminAuthBody:  'Anmeldeanfrage an das Admin-Panel. Genehmigst du?',
};

// To support a new language, add its texts above and list it here: the user
// model and the push-token endpoint both derive their allowed values from it.
const CATALOG = { fr, en, es, pt, de } satisfies Record<string, PushTexts>;

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
