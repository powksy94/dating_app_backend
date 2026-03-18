import { Response } from "express";
import { Match } from "../models/match.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

export async function getMyMatches(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const matches = await Match.find({ users: userId })
        .populate({ path: 'users', model: 'User', select: '_id email' });

    res.json(matches);
    
}