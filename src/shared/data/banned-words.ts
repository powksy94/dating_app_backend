import bannedWordsData from './banned-words.json' assert { type: 'json' };
const { words } = bannedWordsData;

function normalize(text: string): string {
    return text.toLowerCase()
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/0/g, 'o')
        .replace(/7/g, 't')
        .replace(/1/g, 'i')
        .replace(/[@]/g, 'a')
        .replace(/[€]/g, 'e')
        .replace(/[*.\-_]/g, '');
}

export function containsBannedWord(text: string): boolean {
    const normalized = normalize(text);
    return (words as string[]).some(word => normalized.includes(normalize(word)));
}
