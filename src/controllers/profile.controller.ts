import { Response } from "express";
import { Profile } from "../models/profile.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { Readable } from 'stream';

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.userId });
    if (!profile) { res.status(404).json({ message : 'Profil introuvable '}); return; }
    res.json(profile)
}

export async function UptapeMyProfile(req: AuthRequest, res: Response): Promise<void> {
    const allowed = [
        'username', 'bio', 'age', 'avatarUrl', 'musicsGenres',
        'musicsVibes', 'aesthetics', 'soundIntensity', 'musicEras',
        'discoveryFormats', 'favoriteBands', 'upcomingEvents', 'socialLinks', 'location',
        'birthDate', 'gender', 'pronouns', 'genderPreferences', 'ageMin', 'ageMax',
        'maxDistance', 'profileComplete',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const profile = await Profile.findOneAndUpdate(
        { owner: req.userId },
        { $set: updates },
        { new: true }
    );
    res.json(profile);
}

const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.array('photos', 6);

export async function uploadPhotos(req: AuthRequest, res: Response): Promise<void> {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ message: 'Aucun fichier reçu' });
        return;
    }

    const urls: string[] = [];
    for (const file of files) {
        const url = await new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'nocturne/profiles', resource_type: 'image' },
                (err, result) => err ? reject(err) : resolve(result!.secure_url)
            );
            Readable.from(file.buffer).pipe(stream);
        });
        urls.push(url);
    }

    const profile = await Profile.findOneAndUpdate(
        { owner: req.userId },
        { $set: { photos: urls, avatarUrl: urls[0] } },
        { new: true }
    );
    res.json({ photos: urls, profile });
}

export async function getProfileByUserId(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.params.userId });
    if (!profile) { res.status(404).json({ message: 'Profile introuvable' }); return };
    res.json(profile);
}