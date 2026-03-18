import { Response } from "express";
import { Profile } from "../models/profile.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.userId });
    if (!profile) { res.status(404).json({ message : 'Profil introuvable '}); return; }
    res.json(profile)
}

export async function UptapeMyProfile(req: AuthRequest, res: Response): Promise<void> {
    const allowed = [
        'username', 'bio', 'age', 'avatarUrl', 'musicGenres',
        'musicVibes', 'aesthetics', 'soundIntensity', 'musicEras',
        'discoveryFormats', 'favoriteBands', 'upcomingEvents', 'socialLinks', 'location', 
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

export async function getProfileByUserId(req: AuthRequest, res: Response): Promise<void> {
    const profile = await Profile.findOne({ owner: req.params.userId });
    if (!profile) { res.status(404).json({ message: 'Profile introuvable' }); return };
    res.json(profile);
}