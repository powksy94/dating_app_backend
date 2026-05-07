import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Message } from '../models/message.model.js';
import { Match } from '../models/match.model.js';

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

        socket.on('join_room', (matchId: string) => {
            socket.join(matchId);
        });

        socket.on('send_message', async ({ matchId, text }: {matchId: string; text: string}) => {
            if (!text?.trim())return;
        
            const match = await Match.findOne({ _id: matchId, users: userId});
            if (!match) return;

            const message = await Message.create({
                matchId,
                sender: userId,
                text: text.trim(),
            });
            io.to(matchId).emit('new_message', {
                _id:            message._id.toString(),
                matchId,
                sender:         userId,
                text:           message.text,
                createdAt:      (message as any).createdAt,               
            });
        });
        socket.on('typing', (matchId: string) => {
            socket.to(matchId).emit('user_typing', userId);
        });

        socket.on('stop_typing', (matchId: string) => {
            socket.to(matchId).emit('user_stop_typing', userId);
        });
    });

    return io;
}