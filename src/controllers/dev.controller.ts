import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import { User } from "../models/user.model.js";
import { Profile } from "../models/profile.model.js";
import { Like } from "../models/like.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const MOCK_USERS = [
    {
        email: 'morgana@nocturne.demo',
        username: 'Morgana',
        bio: 'Fan de darkwave et de concerts sous la pluie. Collectionneuse de vinyles.',
        age: 24,
        pronouns: 'elle/her',
        aesthetics: ['goth', 'dark academia'],
        musicGenres: ['darkwave', 'gothic rock'],
        musicVibes: ['dark', 'melancholic'],
        musicEras: ['80s goth'],
        soundIntensity: ['intense'],
        discoveryFormats: ['concerts', 'vinyl collector'],
        avatarUrl: 'https://i.pravatar.cc/400?img=47',
        photos: [
            'https://i.pravatar.cc/600?img=47',
            'https://picsum.photos/seed/morgana1/600/800',
            'https://picsum.photos/seed/morgana2/600/800',
            'https://picsum.photos/seed/morgana3/600/800',
        ],
    },
    {
        email: 'corvus@nocturne.demo',
        username: 'Corvus',
        bio: 'Musicien post-punk, passionné de synthés vintage et de cinéma noir.',
        age: 27,
        pronouns: 'il/lui',
        aesthetics: ['punk DIY', 'cyber goth'],
        musicsGenres: ['post-punk', 'EBM'],
        musicsVibes: ['cold', 'hypnotic'],
        musicEras: ['2000s industrial'],
        soundIntensity: ['chaotic'],
        discoveryFormats: ['bandcamp', 'concerts'],
        avatarUrl: 'https://i.pravatar.cc/400?img=12',
        photos: [
            'https://i.pravatar.cc/600?img=12',
            'https://picsum.photos/seed/corvus1/600/800',
            'https://picsum.photos/seed/corvus2/600/800',
            'https://picsum.photos/seed/corvus3/600/800',
        ],
    },
    {
        email: 'selene@nocturne.demo',
        username: 'Séléné',
        bio: 'Emo kid forever. Passionnée de screamo et de zines DIY.',
        age: 22,
        pronouns: undefined,
        aesthetics: ['emo kid', 'scene'],
        musicsGenres: ['screamo', 'post-hardcore'],
        musicsVibes: ['emotional', 'raw'],
        musicEras: ['2000s emo', 'tumblr era'],
        soundIntensity: ['soft', 'intense'],
        discoveryFormats: ['playlists', 'concerts'],
        avatarUrl: 'https://i.pravatar.cc/400?img=32',
        photos: [
            'https://i.pravatar.cc/600?img=32',
            'https://picsum.photos/seed/selene1/600/800',
            'https://picsum.photos/seed/selene2/600/800',
            'https://picsum.photos/seed/selene3/600/800',
        ],
    },
];

const DEMO_PASSWORD_HASH = await bcrypt.hash('nocturne_demo_secret', 10);

export async function seedMockUsers(_req: Request, res: Response): Promise<void> {
    const created: string[] = [];

    for (const mock of MOCK_USERS) {
        let user = await User.findOne({ email: mock.email });
        if (!user) {
            user = await User.create({ email: mock.email, passwordHash: DEMO_PASSWORD_HASH });
        }
        const profileExists = await Profile.findOne({ owner: user._id });
        if (!profileExists) {
            await Profile.create({
                owner:           user._id,
                username:        mock.username,
                avatarUrl:       mock.avatarUrl,
                photos:          mock.photos,
                bio:             mock.bio,
                age:             mock.age,
                pronouns:        mock.pronouns,
                aesthetics:      mock.aesthetics,
                musicsGenres:    mock.musicsGenres,
                musicsVibes:     mock.musicsVibes,
                musicEras:       mock.musicEras,
                soundIntensity:  mock.soundIntensity,
                discoveryFormats: mock.discoveryFormats,
                profileComplete: true,
            });
            created.push(mock.username);
        }
    }

    res.json({ message: 'Mock users prêts', created });
}

export async function seedDemoLikes(req: AuthRequest, res: Response): Promise<void> {
    const currentUserId = new mongoose.Types.ObjectId(req.userId);
    const liked: string[] = [];

    for (const mock of MOCK_USERS) {
        const mockUser = await User.findOne({ email: mock.email });
        if (!mockUser) continue;

        await Like.updateOne(
            { from: mockUser._id, to: currentUserId },
            {},
            { upsert: true }
        );
        liked.push(mock.username);
    }

    res.json({ message: 'Likes démo insérés', liked });
}