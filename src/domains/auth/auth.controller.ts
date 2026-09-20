import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from "../../shared/models/user.model.js";
import { Profile } from "../profile/profile.model.js";
import { Like } from "../discovery/like.model.js";
import { Match } from "../match/match.model.js";
import { Message } from "../chat/message.model.js";
import { Elegie } from "../elegie/elegie.model.js";
import { Event } from "../event/event.model.js";
import { usernameProblem } from "./username-validation.js";
import cloudinary from "../../infrastructure/config/cloudinary.js";
import type { AuthRequest } from "../../shared/middleware/auth.middleware.js";

function generateTokenPair(userId: string): { accessToken: string; refreshToken: string; refreshTokenExpiry: Date } {
    const accessToken       = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken      = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    return { accessToken, refreshToken, refreshTokenExpiry };
}

export async function register(req: Request, res: Response): Promise<void> {
    const { email, password, username, testBuild } = req.body;
    // Set once, from the build that created the account: never trust it again
    // after this (see profile-validation.ts, which the client can't rewrite).
    const isTestAccount = testBuild === true;
    if (!email || !password || !username) {
        res.status(400).json({ message: 'email, password et username requis' });
        return;
    }

    // The pseudo rules (format, insults, uniqueness) apply here too, not only in
    // check-username: a client can skip that call.
    const problem = await usernameProblem(username);
    if (problem) {
        res.status(problem.taken ? 409 : 400).json({ message: problem.reason });
        return;
    }

    const exists = await User.findOne({ email });
    if (exists) {
        res.status(409).json({ message: 'Email déjà utilisé' });
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, isTestAccount });

    // Create an empty profile linked to this user
    await Profile.create({ owner: user._id, username, isTestAccount });

    const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair(user._id.toString());
    await User.findByIdAndUpdate(user._id, { refreshToken, refreshTokenExpiry });

    res.status(201).json({ token: accessToken, refreshToken, userId: user._id });
}

export async function login(req: Request, res: Response): Promise<void> {
    const {email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'email et password requis' });
        return;
    }

    const user = await User.findOne({ email });
    if (!user) {
        res.status(401).json({ message: 'Identifiants invalides' });
        return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ message: 'Identifiants invalides' });
        return;
    }

    if (user.banned) {
        res.status(403).json({ message: 'Ce compte a été suspendu', code: 'ACCOUNT_BANNED' });
        return;
    }

    const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair(user._id.toString());
    await User.findByIdAndUpdate(user._id, { refreshToken, refreshTokenExpiry });

    res.json({ token: accessToken, refreshToken, userId: user._id });
}

export async function me(req: Request, res: Response): Promise<void> {
    // req.userId injected by authMiddleware
    const user = await User.findById((req as any).userId).select('-passwordHash');
    if (!user) { res.status(404).json({ message: 'Utilisateur introuvable' }); return; }
    res.json(user);
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
        res.status(400).json({ message: 'Mot de passe actuel et nouveau requis' });
        return;
    }
    if (newPassword.length < 12) {
        res.status(400).json({ message: 'Le nouveau mot de passe doit faire au moins 12 caractères' });
        return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
        res.status(404).json({ message: 'Utilisateur introuvable' });
        return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
        res.status(401).json({ message: 'Mot de passe actuel incorrect' });
        return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });
}

export async function checkUsername(req: Request, res: Response): Promise<void> {
    const problem = await usernameProblem(req.query.username);
    if (problem?.taken) {
        res.json({ available: false });
        return;
    }
    if (problem) {
        res.status(400).json({ available: false, reason: problem.reason });
        return;
    }
    res.json({ available: true });
}

export async function refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(401).json({ message: 'Refresh token manquant' }); return; }

    const user = await User.findOne({ refreshToken, refreshTokenExpiry: { $gt: new Date() } });
    if (!user) { res.status(401).json({ message: 'Refresh token invalide ou expiré' }); return; }

    const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiry } = generateTokenPair(user._id.toString());
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken, refreshTokenExpiry });

    res.json({ token: accessToken, refreshToken: newRefreshToken });
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
    // Also drop the push token so the device stops receiving this account's notifications.
    await User.findByIdAndUpdate(req.userId, {
        refreshToken: null, refreshTokenExpiry: null, fcmToken: null,
    });
    res.json({ message: 'Déconnecté' });
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // Fetch the Cloudinary photos before deletion
    const profile = await Profile.findOne({ owner: userId });
    if (profile?.photos?.length) {
        for (const url of profile.photos) {
            try {
                const parts   = url.split('/');
                const file    = parts[parts.length - 1].split('.')[0];
                const folder  = parts[parts.length - 2];
                await cloudinary.uploader.destroy(`${folder}/${file}`);
            } catch (_) {}
        }
    }

    // Fetch the matchIds to delete the messages
    const matches  = await Match.find({ users: userId });
    const matchIds = matches.map(m => m._id);

    await Promise.all([
        Message.deleteMany({ matchId: { $in: matchIds } }),
        Match.deleteMany({ users: userId }),
        Like.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
        Elegie.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
        Event.updateMany({ attendees: userId }, { $pull: { attendees: userId } }),
        Profile.deleteOne({ owner: userId }),
    ]);

    await User.deleteOne({ _id: userId });

    res.json({ message: 'Compte supprimé avec succès' });
}