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

// Create event {soon}
