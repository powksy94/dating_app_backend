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

// list Events {soon}
