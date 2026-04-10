import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Elegie } from '../models/elegie.model.js';
import { Like } from '../models/like.model.js';
import { Match } from '../models/match.model.js';
import { Message } from '../models/message.model.js';
import { Profile } from '../models/profile.model.js';
import mongoose from 'mongoose';

export async function sendElegie(req: AuthRequest, res: Response): Promise<void> {
    const fromId   = new mongoose.Types.ObjectId(req.userId);
    const toId     = new mongoose.Types.ObjectId(String(req.params.targetId));
    const { text } = req.body as { text: string };

    if (!text || text.trim().length === 0) {
        res.status(400).json({ message: 'Le texte est requis' });
        return;
    }
    if (text.length > 200) {
        res.status(400).json({ message: 'Texte trop long (200 caractères max)' });
        return;
    }
    if (fromId.equals(toId)) {
        res.status(400).json({ message: 'Impossible de s\'envoyer une élégie à soi-même' });
        return;
    }

    const elegie = await Elegie.findOneAndUpdate(
        { from: fromId, to: toId },
        { text: text.trim(), status: 'pending', dislikeCount: 0 },
        { upsert: true, new: true }
    );

    // Si la cible a déjà liké l'expéditeur → match immédiat
    const alreadyLiked = await Like.findOne({ from: toId, to: fromId });
    if (alreadyLiked) {
        let matchDoc = await Match.findOne({ users: { $all: [fromId, toId] } });
        if (!matchDoc) {
            matchDoc = await Match.create({ users: [fromId, toId] });
        }
        await Elegie.findByIdAndUpdate(elegie!._id, { status: 'matched' });
        await Message.create({
            matchId: matchDoc._id,
            sender:  fromId,
            text:    text.trim(),
        });
        res.json({ message: 'Élégie envoyée', match: true, matchId: matchDoc._id });
        return;
    }

    res.json({ message: 'Élégie envoyée', match: false });
}

export async function getReceived(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const elegies = await Elegie.find({ to: userId, status: 'pending' })
        .sort({ createdAt: -1 });

    const result = await Promise.all(elegies.map(async (e) => {
        const profile = await Profile.findOne(
            { owner: e.from },
            { username: 1, avatarUrl: 1 }
        );
        return {
            id:          e._id,
            fromId:      e.from,
            fromUsername: profile?.username ?? 'Utilisateur inconnu',
            fromAvatarUrl: profile?.avatarUrl ?? '',
            text:        e.text,
            status:      e.status,
            createdAt:   (e as any).createdAt,
        };
    }));

    res.json(result);
}

export async function getSent(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const elegies = await Elegie.find({ from: userId, status: 'pending' })
        .sort({ createdAt: -1 });

    const result = await Promise.all(elegies.map(async (e) => {
        const profile = await Profile.findOne(
            { owner: e.to },
            { username: 1, avatarUrl: 1 }
        );
        return {
            id:           e._id,
            toId:         e.to,
            toUsername:   profile?.username ?? 'Utilisateur inconnu',
            toAvatarUrl:  profile?.avatarUrl ?? '',
            text:         e.text,
            status:       e.status,
            createdAt:    (e as any).createdAt,
        };
    }));

    res.json(result);
}
