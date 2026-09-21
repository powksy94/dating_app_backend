import { Response } from "express";
import { Message } from "./message.model.js";
import { Match } from "../match/match.model.js";
import { User } from "../../shared/models/user.model.js";
import { Profile } from "../profile/profile.model.js";
import { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import { getIO } from "../../infrastructure/socket/socket.js";
import { sendPushNotification } from "../../shared/services/notification.service.js";
import { pushTexts } from "../../shared/services/push-messages.js";
import { isContactInfoRefused } from "./contact-guard.js";
import mongoose from "mongoose";
import multer from "multer";
import { Readable } from "stream";
import cloudinary from "../../infrastructure/config/cloudinary.js";

const upload = multer({ storage: multer.memoryStorage() });
export const uploadChatImageMiddleware = upload.single('image');
export const uploadChatAudioMiddleware = upload.single('audio');

async function assertMatchMember(matchId: string, userId: string): Promise<boolean> {
    const match = await Match.findById(matchId);
    if (!match) return false;
    return match.users.some((u) => u.equals(new mongoose.Types.ObjectId(userId)));
    
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId!);
    if (!await assertMatchMember(req.params.matchId as string, req.userId!)) {
        res.status(403).json({ message: 'Access denied' });
        return;
    }
    const messages = await Message.find({
        matchId:    req.params.matchId,
        deletedFor: { $ne: userId },
    }).sort({ createdAt: 1 }).select('-deletedFor').lean();
    res.json(messages);
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
    const { text } = req.body;
    if (!text?.trim()) {
        res.status(400).json({ message: 'Empty message' });
        return;
    }
    if (!await assertMatchMember(req.params.matchId as string, req.userId!)) {
        res.status(403).json({ message: 'Access denied' });
        return;
    }

    const matchId = req.params.matchId as string;
    const userId  = req.userId!;

    // No link or phone number until the other person has replied (same rule as the socket).
    if (await isContactInfoRefused(matchId, userId, text)) {
        res.status(422).json({
            code:    'CONTACT_INFO_BLOCKED',
            message: 'Links and phone numbers are not allowed until the other person has replied.',
        });
        return;
    }

    const message = await Message.create({
        matchId,
        sender: userId,
        text:   text.trim(),
    });

    // Broadcast socket
    try {
        const io = getIO();
        io.to(matchId).emit('new_message', {
            _id:       message._id.toString(),
            matchId,
            sender:    userId,
            text:      message.text,
            createdAt: (message as any).createdAt,
        });

        // Push notification if the recipient is not in the room
        const match         = await Match.findById(matchId);
        const otherUserId   = match?.users.find(u => u.toString() !== userId)?.toString();
        const roomMembers   = io.sockets.adapter.rooms.get(matchId) ?? new Set();
        const otherSockets  = [...io.sockets.sockets.values()]
            .filter(s => s.data.userId === otherUserId).map(s => s.id);
        const otherInRoom   = otherSockets.some(sid => roomMembers.has(sid));

        if (otherUserId && !otherInRoom) {
            const [recipientUser, senderProfile] = await Promise.all([
                User.findById(otherUserId).select('fcmToken locale'),
                Profile.findOne({ owner: userId }).select('username'),
            ]);
            if (recipientUser?.fcmToken) {
                await sendPushNotification(
                    recipientUser.fcmToken,
                    senderProfile?.username ?? pushTexts(recipientUser.locale).newMessage,
                    text.trim(),
                    { matchId, type: 'message' },
                );
            }
        }
    } catch (_) {}

    res.status(201).json(message);
}

export async function uploadChatImage(req: AuthRequest, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ message: 'No image' }); return; }

    const url = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'nocturne/chat', resource_type: 'image' },
            (err, result) => {
                if (err || !result) reject(err);
                else resolve(result.secure_url);
            }
        );
        Readable.from(req.file!.buffer).pipe(stream);
    });

    res.json({ url });
}

export async function uploadChatAudio(req: AuthRequest, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ message: 'No audio file' }); return; }

    const url = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'nocturne/chat/audio', resource_type: 'video' },
            (err, result) => {
                if (err || !result) reject(err);
                else resolve(result.secure_url);
            }
        );
        Readable.from(req.file!.buffer).pipe(stream);
    });

    res.json({ url });
}

export async function deleteForMe(req: AuthRequest, res: Response): Promise<void> {
    const userId    = new mongoose.Types.ObjectId(req.userId!);
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) { res.status(404).json({ message: 'Message not found' }); return; }

    await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
    res.json({ message: 'Message deleted for you' });
}

export async function deleteForAll(req: AuthRequest, res: Response): Promise<void> {
    const userId    = new mongoose.Types.ObjectId(req.userId!);
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) { res.status(404).json({ message: 'Message not found' }); return; }
    if (!message.sender.equals(userId)) {
        res.status(403).json({ message: 'Only the sender can delete for everyone' });
        return;
    }

    await Message.findByIdAndUpdate(messageId, { deletedForAll: true });
    res.json({ messageId, deletedForAll: true });
}