// Allowed values for the profile fields with a closed vocabulary. They mirror the
// app: keep them in sync with app_rencontre/lib/core/music_tags.dart and
// app_rencontre/lib/core/gender_options.dart. Tags are inserted in suggested
// messages, so anything outside these lists is refused.

export const MUSIC_GENRES = [
    'gothic rock', 'darkwave', 'coldwave', 'deathrock', 'ethereal wave',
    'emo', 'midwest emo', 'screamo', 'skramz', 'post-hardcore',
    'shoegaze', 'dream pop', 'indie rock', 'noise rock', 'slowcore',
    'industrial', 'EBM', 'aggrotech', 'dark electro', 'witch house',
];

export const MUSIC_VIBES = [
    'dark', 'melancholic', 'nostalgic', 'romantic', 'angry',
    'dreamy', 'introspective', 'atmospheric', 'depressive', 'energetic',
];

export const AESTHETICS = [
    'goth', 'emo kid', 'punk DIY', 'alternative', 'underground',
    'indie', 'metalhead', 'rave / club', 'arty',
];

export const SOUND_INTENSITY = [
    'soft', 'chill', 'mid-energy', 'intense', 'aggressive', 'chaotic',
];

export const MUSIC_ERAS = [
    '80s goth', '90s alternative', '2000s emo',
    'tumblr era', 'modern post-punk', 'underground revival',
];

export const DISCOVERY_FORMATS = [
    'concerts', 'vinyl collector', 'bandcamp digger',
    'playlist explorer', 'underground scenes',
];

export const GENDERS = [
    'male', 'female', 'non_binary', 'genderfluid', 'agender',
    'transmasculine', 'transfeminine', 'other',
];

// A gender preference can also be "all".
export const GENDER_PREFERENCES = [...GENDERS, 'all'];

export const PRONOUNS = [
    'he_him', 'she_her', 'they_them', 'plural_neutral', 'other',
];
