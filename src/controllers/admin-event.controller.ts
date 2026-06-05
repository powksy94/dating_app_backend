import { Response } from "express";
import type { AdminRequest } from "../middleware/admin.middleware.js";
import { Event } from "../models/event.model.js";
import { Profile } from "../models/profile.model.js";
import { User } from "../models/user.model.js";

export async function listPendingEvents(_req: AdminRequest, res: Response): Promise<void> {
    const events = await Event.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();

    const creatorIds = [...new Set(events.map(e => e.creatorId.toString()))];
    const [profiles, users] = await Promise.all([
        Profile.find({ owner: { $in: creatorIds } }).select('owner username').lean(),
        User.find({ _id: { $in: creatorIds } }).select('email').lean(),
    ]);

    const profileMap = new Map(profiles.map(p => [p.owner.toString(), p.username]));
    const userMap    = new Map(users.map(u => [(u._id as any).toString(), u.email]));

    const result = events.map(e => ({
        _id: e._id, title: e.title, description: e.description,
        date: e.date, endDate: (e as any).endDate ?? null,
        city: e.city, address: e.address, type: (e as any).type ?? null,
        genres: e.genres, tags: e.genres,
        coverImageUrl: e.coverImageUrl, imageUrl: e.coverImageUrl,
        isFree: e.isFree, price: e.price,
        capacityMin: e.capacityMin, capacityMax: e.capacityMax,
        maxAttendees: e.capacityMax ?? null, attendeesCount: e.attendees.length,
        status: e.status, createdAt: (e as any).createdAt,
        organizer: {
            id:       e.creatorId.toString(),
            username: profileMap.get(e.creatorId.toString()) ?? null,
            email:    userMap.get(e.creatorId.toString()) ?? null,
        },
    }));

    res.json(result);
}

export async function approveEvent(req: AdminRequest, res: Response): Promise<void> {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!event) { res.status(404).json({ message: 'Évènement introuvable' }); return; }
    res.json({ message: 'Évènement approuvé', event });
}

export async function rejectEvent(req: AdminRequest, res: Response): Promise<void> {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!event) { res.status(404).json({ message: 'Évènement introuvable' }); return; }
    res.json({ message: 'Évènement rejeté', event });
}
