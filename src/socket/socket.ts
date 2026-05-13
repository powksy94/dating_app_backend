import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Message } from '../models/message.model.js';
import { Match } from '../models/match.model.js';
import { User } from '../models/user.model.js';
import { Profile } from '../models/profile.model.js';
import { sendPushNotification } from '../services/notification.service.js';

// userId → lastSeen timestamp
const onlineUsers = new Map<string, Date>();

export function isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
}

export function getUserLastSeen(userId: string): Date | null {
    return onlineUsers.get(userId) ?? null;
}

export function initSocket(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: { origin: '*' },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Token manquant'));
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            socket.data.userId = payload.userId;
            next();
        } catch {
            next(new Error('Token invalide'));
        }
    });

    io.on('connection', (socket) => {
        const userId: string = socket.data.userId;

        // ── Online status ─────────────────────────────────────────────────────
        onlineUsers.set(userId, new Date());
        socket.broadcast.emit('user_online', userId);

        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            onlineUsers.set(userId, new Date()); // garde lastSeen
            socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() });
            onlineUsers.delete(userId);
        });

        // ── Rooms ─────────────────────────────────────────────────────────────
        socket.on('join_room', (matchId: string) => {
            socket.join(matchId);
            // Envoie le statut en ligne de l'autre à qui rejoint
            socket.emit('online_status', {
                userId,
                online: true,
            });
        });

        socket.on('get_online_status', (targetUserId: string) => {
            socket.emit('online_status', {
                userId:   targetUserId,
                online:   onlineUsers.has(targetUserId),
                lastSeen: getUserLastSeen(targetUserId),
            });
        });

        // ── Messages ──────────────────────────────────────────────────────────
        socket.on('send_message', async ({ matchId, text, imageUrl, audioUrl, replyTo }: {
            matchId:   string;
            text:      string;
            imageUrl?: string;
            audioUrl?: string;
            replyTo?:  { id: string; text: string; sender: string; imageUrl?: string };
        }) => {
            if (!text?.trim() && !imageUrl && !audioUrl) return;

            const match = await Match.findOne({ _id: matchId, users: userId });
            if (!match) return;

            const message = await Message.create({
                matchId,
                sender:   userId,
                text:     text?.trim() ?? '',
                imageUrl,
                audioUrl,
                replyTo,
            });

            io.to(matchId).emit('new_message', {
                _id:       message._id.toString(),
                matchId,
                sender:    userId,
                text:      message.text,
                imageUrl:  message.imageUrl,
                audioUrl:  message.audioUrl,
                replyTo:   message.replyTo,
                createdAt: (message as any).createdAt,
            });

            // Push notification si le destinataire n'est pas dans la salle de conversation
            const otherUserId  = match.users.find(u => u.toString() !== userId)?.toString();
            const roomMembers  = io.sockets.adapter.rooms.get(matchId) ?? new Set();
            const otherSockets = [...io.sockets.sockets.values()]
                .filter(s => s.data.userId === otherUserId)
                .map(s => s.id);
            const otherInRoom  = otherSockets.some(sid => roomMembers.has(sid));

            if (otherUserId && !otherInRoom) {
                const [recipientUser, senderProfile] = await Promise.all([
                    User.findById(otherUserId).select('fcmToken'),
                    Profile.findOne({ owner: userId }).select('username'),
                ]);
                if (recipientUser?.fcmToken) {
                    const notifBody = message.imageUrl ? '📷 Photo' : message.text;
                    await sendPushNotification(
                        recipientUser.fcmToken,
                        senderProfile?.username ?? 'Nouveau message',
                        notifBody,
                        { matchId, type: 'message' },
                    );
                }
            }
        });

        // ── Read receipts ─────────────────────────────────────────────────────
        socket.on('mark_read', async (matchId: string) => {
            const userObjId = new mongoose.Types.ObjectId(userId);
            await Message.updateMany(
                { matchId, sender: { $ne: userObjId }, readBy: { $ne: userObjId } },
                { $addToSet: { readBy: userObjId } }
            );
            socket.to(matchId).emit('messages_read', { matchId, readBy: userId });
        });

        // ── Delete for all ────────────────────────────────────────────────────
        socket.on('delete_message_for_all', async ({ matchId, messageId }: { matchId: string; messageId: string }) => {
            const message = await Message.findOne({ _id: messageId, sender: userId });
            if (!message) return;
            await Message.findByIdAndUpdate(messageId, { deletedForAll: true });
            io.to(matchId).emit('message_deleted_for_all', messageId);
        });

        // ── Reactions ─────────────────────────────────────────────────────────
        socket.on('react_message', async ({ matchId, messageId, emoji }: {
            matchId:   string;
            messageId: string;
            emoji:     string;
        }) => {
            const message = await Message.findById(messageId);
            if (!message) return;

            const reactions = message.reactions ?? new Map<string, string[]>();
            const users     = reactions.get(emoji) ?? [];
            const idx       = users.indexOf(userId);

            if (idx >= 0) {
                users.splice(idx, 1);
            } else {
                users.push(userId);
            }

            if (users.length === 0) {
                reactions.delete(emoji);
            } else {
                reactions.set(emoji, users);
            }

            message.reactions = reactions;
            await message.save();

            const reactionsObj = Object.fromEntries(reactions);
            io.to(matchId).emit('message_reacted', { messageId, reactions: reactionsObj });
        });

        // ── Typing ────────────────────────────────────────────────────────────
        socket.on('typing', (matchId: string) => {
            socket.to(matchId).emit('user_typing', userId);
        });

        socket.on('stop_typing', (matchId: string) => {
            socket.to(matchId).emit('user_stop_typing', userId);
        });
    });

    return io;
}