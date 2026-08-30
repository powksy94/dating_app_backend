import { Response } from "express";
import multer from "multer";
import { Readable } from "stream";
import type { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import { Event } from "./event.model.js";
import { User } from "../../shared/models/user.model.js";
import { PLAN_LIMITS, monthStr } from "../subscription/limits.js";
import cloudinary from "../../infrastructure/config/cloudinary.js";
import { notifyAdminsNewEvent } from "./notify-admins-new-event.js";

const upload = multer({ storage: multer.memoryStorage() });
export const uploadCoverMiddleware = upload.single('cover');

export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
    const {
        title, description, date, city, address,
        lat, lng, genres, capacityMin, capacityMax, isFree, price,
    } = req.body as {
        title: string; description: string; date: string;
        city: string; address: string; lat: string; lng: string;
        genres: string; capacityMin: string; capacityMax?: string;
        isFree: string; price?: string;
    };

    if (!title || !description || !date || !city || !address || !lat || !lng || !capacityMin) {
        res.status(400).json({ message: 'Champs obligatoires manquants' }); return;
    }

    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ message: 'Utilisateur introuvable' }); return; }

    const limit = PLAN_LIMITS.eventsPerMonth[user.subscriptionPlan];
    if (limit !== Infinity) {
        const month = monthStr();
        if (user.monthlyEvents.month !== month) {
            user.monthlyEvents.count = 0;
            user.monthlyEvents.month = month;
        }
        if (user.monthlyEvents.count >= limit) {
            res.status(403).json({
                code: 'EVENT_LIMIT_REACHED',
                message: `Limite de ${limit} événements/mois atteinte`,
                limit, remaining: 0,
            });
            return;
        }
        user.monthlyEvents.count += 1;
        await user.save();
    }

    let coverImageUrl = '';
    if (req.file) {
        coverImageUrl = await new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'nocturne/events', resource_type: 'image' },
                (err, result) => {
                    if (err || !result) reject(err);
                    else resolve(result.secure_url);
                }
            );
            Readable.from(req.file!.buffer).pipe(stream);
        });
    }

    const event = await Event.create({
        title: title.trim(), description: description.trim(),
        date: new Date(date), city: city.trim(), address: address.trim(),
        location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        genres: genres ? genres.split(',').map(g => g.trim()).filter(Boolean) : [],
        coverImageUrl, creatorId: req.userId, attendees: [],
        capacityMin: parseInt(capacityMin),
        capacityMax: capacityMax ? parseInt(capacityMax) : undefined,
        isFree: isFree === 'true',
        price: price ? parseFloat(price) : undefined,
        status: 'pending',
    });

    notifyAdminsNewEvent(event._id.toString(), event.title, event.description).catch(() => {});

    res.status(201).json({ message: 'Événement soumis pour modération', eventId: event._id });
}
