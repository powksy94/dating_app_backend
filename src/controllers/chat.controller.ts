import { Response } from "express";
import { Message } from "../models/message.model.js";
import { Match } from "../models/match.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

async function assertMatchMember(matchId: string, userId: string): Promise<boolean> {
    const match = await Match.findById(matchId);
    if (!match) return false;
    return match.users.some((u) => u.equals(new mongoose.Types.ObjectId(userId)));
    
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId!);
    if (!await assertMatchMember(req.params.matchId as string, req.userId!)) {
        res.status(403).json({ message: 'Accès refusé' });
        return;
    }
    const messages = await Message.find({
        matchId:    req.params.matchId,
        deletedFor: { $ne: userId },
    }).sort({ createdAt: 1 });
    res.json(messages);
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
    const { text } = req.body;
    if (!text?.trim()) {
        res.status(400).json({ message: 'Message vide' });
        return;
    }
    if (!await assertMatchMember(req.params.matchId as string, req.userId!)) {
        res.status(403).json({ message: 'Accès refusé' });
        return;
    }

    const message = await Message.create({
        matchId: req.params.matchId as string,
        sender:  req.userId,
        text:    text.trim(),
    });
    res.status(201).json(message);
}

export async function deleteForMe(req: AuthRequest, res: Response): Promise<void> {
    const userId    = new mongoose.Types.ObjectId(req.userId!);
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) { res.status(404).json({ message: 'Message introuvable' }); return; }

    await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
    res.json({ message: 'Message supprimé pour vous' });
}

export async function deleteForAll(req: AuthRequest, res: Response): Promise<void> {
    const userId    = new mongoose.Types.ObjectId(req.userId!);
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) { res.status(404).json({ message: 'Message introuvable' }); return; }
    if (!message.sender.equals(userId)) {
        res.status(403).json({ message: 'Seul l\'expéditeur peut supprimer pour tous' });
        return;
    }

    await Message.findByIdAndUpdate(messageId, { deletedForAll: true });
    res.json({ messageId, deletedForAll: true });
}