import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Message } from '../models/message.model.js';
import { Match } from '../models/match.model.js';

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
        socket.on('send_message', async ({ matchId, text }: { matchId: string; text: string }) => {
            if (!text?.trim()) return;

            const match = await Match.findOne({ _id: matchId, users: userId });
            if (!match) return;

            const message = await Message.create({
                matchId,
                sender: userId,
                text:   text.trim(),
            });

            io.to(matchId).emit('new_message', {
                _id:       message._id.toString(),
                matchId,
                sender:    userId,
                text:      message.text,
                createdAt: (message as any).createdAt,
            });
        });

        // ── Delete for all ────────────────────────────────────────────────────
        socket.on('delete_message_for_all', async ({ matchId, messageId }: { matchId: string; messageId: string }) => {
            const message = await Message.findOne({ _id: messageId, sender: userId });
            if (!message) return;
            await Message.findByIdAndUpdate(messageId, { deletedForAll: true });
            io.to(matchId).emit('message_deleted_for_all', messageId);
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