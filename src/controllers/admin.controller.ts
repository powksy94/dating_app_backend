import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Admin } from "../models/admin.model.js";
import { User } from "../models/user.model.js";
import { Profile } from "../models/profile.model.js";
import { Like } from "../models/like.model.js";
import { Match } from "../models/match.model.js";
import { Message } from "../models/message.model.js";
import { logger } from "../config/logger.js";

export async function adminLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'email et password requis' });
        return;
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
        logger.warn(`Tentative de connexion admin échouée : ${email}`);
        res.status(401).json({ message: 'Identifiants invalides' });
        return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
        logger.warn(`Mot de passe incorrect pour admin : ${email}`);
        res.status(401).json({ message: 'Identifiants invalides' });
        return;
    }

    const token = jwt.sign(
        { adminId: admin._id, role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any }
    );

    logger.info(`Admin connecté : ${email}`);
    res.json({ token, adminId: admin._id });
}

export async function getStats(_req: Request, res: Response): Promise<void> {
    const [users, profiles, likes, matches, messages] = await Promise.all([
        User.countDocuments(),
        Profile.countDocuments(),
        Like.countDocuments(),
        Match.countDocuments(),
        Message.countDocuments(),
    ]);

    logger.info('Stats admin consultées');
    res.json({ users, profiles, likes, matches, messages });
}