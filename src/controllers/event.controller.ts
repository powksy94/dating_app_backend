import { Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Readable } from "stream";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import type { AdminRequest } from "../middleware/admin.middleware.js";
import { Event } from "../models/event.model.js";
import { Profile } from "../models/profile.model.js";
import { Match } from "../models/match.model.js";
import cloudinary from "../config/cloudinary.js";

const upload = multer({ storage: multer.memoryStorage() });
export const uploadCoverMiddleware = upload.single('cover');

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng /2 ) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Create event 
export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
    const {
        title, description, date, city, address,
        lat, lng, genres, capacityMin, capacityMax,
        isFree, price,
    } = req.body as {
        title: string; description: string; date: string;
        city: string; address: string; lat: string; lng: string;
        genres: string; capacityMin: string; capacityMax?: string;
        isFree: string; price?: string;
    };

    if (!title || !description || !date || !city || !address || !lat || !lng || !capacityMin) {
        res.status(400).json({ message: 'Champs obligatoires manquants' });
        return;
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

    const genresArr = genres ? genres.split(',').map(g => g.trim()).filter(Boolean) : [];

    const event = await Event.create({
        title:          title.trim(),
        description:    description.trim(),
        date:           new Date(date),
        city:           city.trim(),
        address:        address.trim(),
        location:       { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        genres:         genresArr,
        coverImageUrl,
        creatorId:      req.userId,
        attendees:      [],
        capacityMin:    parseInt(capacityMin),
        capacityMax:    capacityMax ? parseInt(capacityMax) : undefined,
        isFree:         isFree === 'true',
        price:          price ? parseFloat(price) : undefined,
        status:         'pending',
    });

    res.status(201).json({ message: 'Événement soumis pour modération', eventId: event._id });
}

// list Events
export async function listEvents(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { maxDistance, lat, lng, filterGenres } = req.query as {
        maxDistance?: string; lat?: string; lng?: string; filterGenres?: string;
    };

    const profile = await Profile.findOne({ owner : userId });
    const userGenres = [
        ...(profile?.musicsGenres  ?? []),
        ...(profile?.musicsVibes     ?? []),
    ];

    const matches = await Match.find({ users: userId });
    const matchUsersIds = matches.flatMap(m =>
        m.users.filter(u => !u.equals(userId)).map(u => u.toString())
    );


    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null ;
    const maxDist = maxDistance ? parseFloat(maxDistance) : 100;

    const query: Record<string, unknown> = {
        status: 'approved',
        date:   { $gte: new Date() },
    };

    if (filterGenres === 'true' && userGenres.length > 0) query.genres = { $in: userGenres };

    if (userLat !== null && userLng !== null) {
        query.location = {
            $near: {
                $geometry:    { type: 'Point', coordinates: [userLng, userLat] },
                $maxDistance: maxDist * 1000,
            },
        };
    }

    const events = await Event.find(query).sort({ date: 1 }).limit(50);

    const result = await Promise.all(events.map(async (event) => {
        const attendeeIds   = event.attendees.map(a => a.toString());
        const isAttending   = attendeeIds.includes(userId.toString());
        const mutualIds     = attendeeIds.filter(id => matchUsersIds.includes(id));

        const mutualProfiles    = await Profile.find(
            { owner: { $in: mutualIds.slice(0, 2).map(id => new mongoose.Types.ObjectId(id)) } },
            { owner: 1, username: 1, avatarUrl: 1}
        );

        let distance: number | undefined;
        if (userLat !== null && userLng !== null && event.location?.coordinates) {
            const [eLng, eLat] = event.location.coordinates;
            distance = Math.round(haversine(userLat, userLng, eLat, eLng) * 10) /10;
        }

        return {
            id:                     event._id,
            title:                  event.title,
            description:            event.description,
            date:                   event.date,
            city:                   event.city,
            address:                event.address,
            genres:                 event.genres,
            coverImageUrl:          event.coverImageUrl,
            isFree:                 event.isFree,
            price:                  event.price,
            capacityMin:            event.capacityMin,
            capacityMax:            event.capacityMax,
            attendeeCount:          event.attendees.length,
            isAttending,
            mutualAttendees:        mutualProfiles.map(p => ({
                userId:     p.owner,
                username:   p.username,
                avatarUrl:  p.avatarUrl,
            })),

            mutualAttendeesCount: mutualIds.length,
            distance,
        };
    }));

    res.json(result);
}

export async function attendEvent(req: AuthRequest, res: Response): Promise<void> {
    const userId    = new mongoose.Types.ObjectId(req.userId);
    const event     = await Event.findOne({ _id: req.params.id, status: 'approved' });

    if (!event) { res.status(404).json({ message: 'Évènement introuvable' }); return; }
    if (event.attendees.some(a => a.equals(userId))) {
        res.status(409).json({ message: 'Déjà inscrit' }); return;
    }
    if (event.capacityMax && event.attendees.length >= event.capacityMax) {
        res.status(409).json({ message: 'Évènement complet' }); return;
    }

    await Event.findByIdAndUpdate(req.params.id, { $addToSet: { attendees: userId } });
    res.json({ message: 'Inscription confirmée' });
}

export async function unattendEvent(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    await Event.findByIdAndUpdate(req.params.id, { $pull: { attendees: userId } });
    res.json({ message: 'Désinscription confirmée' });
}

export async function listPendingEvents(_req: AdminRequest, res: Response): Promise<void> {
    const events = await Event.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(events);
}

export async function approveEvent(req: AdminRequest, res: Response): Promise<void> {
    const event = await Event.findByIdAndUpdate(
        req.params.id, { status: 'approved' }, { new: true }
    );
    if (!event) { res.status(404).json({ message: 'Évènement introuvable' }); return; }
    res.json({ message: 'Évènement approuvé', event });
}

export async function rejectEvent(req: AdminRequest, res: Response): Promise<void> {
    const event = await Event.findByIdAndUpdate(
        req.params.id, { status: 'rejected' }, { new: true }
    );
    if (!event) { res.status(404).json({ message: 'Évènement introuvable' }); return; }
    res.json({ message: 'Évènement rejeté', event });
}
