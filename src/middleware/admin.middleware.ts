import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js'

export interface AdminRequest extends Request {
    adminId?: string;
}

export function adminMiddleware(req: AdminRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        logger.warn('Accès admin sans token');
        res.status(401).json({ message: 'Token manquant' });
        return;
    }

    const token = header.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { adminId: string; role: string };
        if (payload.role !== 'admin') {
            logger.warn('Tentative d\'accès admin avec un token non-admin'); 
            res.status(403).json({ message: 'Accès interdit' });
            return;
        }
        req.adminId = payload.adminId;
        next();
    } catch {
        logger.warn('Token admin invalide ou expiré');
        res.status(401).json({ message: 'Token invalide ou expiré' });
    }
}