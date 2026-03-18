import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from "../models/user.model.js";
import { Profile } from "../models/profile.model.js";

export async function register(req: Request, res: Response): Promise<void> {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
        res.status(400).json({ message: 'email, password et username requis' });
        return;
    }

    const exists = await User.findOne({ email });
    if (exists) {
        res.status(409).json({ message: 'Email déjà utilisé' });
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });

    // Create an empty profile linked to this user
    await Profile.create({ owner: user._id, username });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any,
    });

    res.status(201).json({ token, userId: user._id });
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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any,
    });

    res.json({ token, userId: user._id });
}

export async function me(req: Request, res: Response): Promise<void> {
    // req.userId injected by authMiddleware
    const user = await User.findById((req as any).userId).select('-passwordHash');
    if (!user) { res.status(404).json({ message: 'Utilisateur introuvable' }); return; }
    res.json(user);
}