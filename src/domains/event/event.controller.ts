import { Response } from "express";
import mongoose from "mongoose";
import type { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import { Event } from "./event.model.js";
import { Profile } from "../profile/profile.model.js";
import { Match } from "../match/match.model.js";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function listEvents(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { maxDistance, lat, lng, filterGenres } = req.query as {
        maxDistance?: string; lat?: string; lng?: string; filterGenres?: string;
    };

    const profile    = await Profile.findOne({ owner: userId });
    const userGenres = [...(profile?.musicsGenres ?? []), ...(profile?.musicsVibes ?? [])];

    const matches        = await Match.find({ users: userId });
    const matchUsersIds  = matches.flatMap(m =>
        m.users.filter(u => !u.equals(userId)).map(u => u.toString())
    );

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const maxDist = maxDistance ? parseFloat(maxDistance) : 100;

    const query: Record<string, unknown> = { status: 'approved', date: { $gte: new Date() } };
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
        const attendeeIds    = event.attendees.map(a => a.toString());
        const isAttending    = attendeeIds.includes(userId.toString());
        const mutualIds      = attendeeIds.filter(id => matchUsersIds.includes(id));
        const mutualProfiles = await Profile.find(
            { owner: { $in: mutualIds.slice(0, 2).map(id => new mongoose.Types.ObjectId(id)) } },
            { owner: 1, username: 1, avatarUrl: 1 }
        );

        let distance: number | undefined;
        if (userLat !== null && userLng !== null && event.location?.coordinates) {
            const [eLng, eLat] = event.location.coordinates;
            distance = Math.round(haversine(userLat, userLng, eLat, eLng) * 10) / 10;
        }

        return {
            id: event._id, title: event.title, description: event.description,
            date: event.date, city: event.city, address: event.address,
            genres: event.genres, coverImageUrl: event.coverImageUrl,
            isFree: event.isFree, price: event.price,
            capacityMin: event.capacityMin, capacityMax: event.capacityMax,
            attendeeCount: event.attendees.length, isAttending,
            mutualAttendees: mutualProfiles.map(p => ({
                userId: p.owner, username: p.username, avatarUrl: p.avatarUrl,
            })),
            mutualAttendeesCount: mutualIds.length, distance,
        };
    }));

    res.json(result);
}

export async function attendEvent(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const event  = await Event.findOne({ _id: req.params.id, status: 'approved' });

    if (!event) { res.status(404).json({ message: 'Évènement introuvable' }); return; }
    if (!event.isFree) {
        res.status(400).json({ message: 'Cet évènement est payant, passe par le paiement pour t\'inscrire' });
        return;
    }
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
