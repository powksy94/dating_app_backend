import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Event } from './event.model.js';

export async function listPendingEventsForMobile(_req: AuthRequest, res: Response): Promise<void> {
    const events = await Event.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .select('title description date city coverImageUrl isFree price')
        .lean();
    res.json(events);
}

export async function approveEventFromMobile(req: AuthRequest, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid event id' });
        return;
    }
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }
    res.json({ message: 'Event approved' });
}

export async function rejectEventFromMobile(req: AuthRequest, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid event id' });
        return;
    }
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }
    res.json({ message: 'Event rejected' });
}
