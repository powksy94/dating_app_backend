import { Request, Response } from "express";
import { User } from "../../../shared/models/user.model.js";
import { Profile } from "../../profile/profile.model.js";
import { Like } from "../../discovery/like.model.js";
import { Match } from "../../match/match.model.js";
import { Message } from "../../chat/message.model.js";
import { dailyHistory } from "./daily-history.js";

const MODELS = {
    users:      User,
    profiles:   Profile,
    likes:      Like,
    matches:    Match,
    messages:   Message,
};

const DEFAULT_DAYS  = 30;
const MIN_DAYS      = 7;
const MAX_DAYS      = 90;

function clampDays(raw: unknown): number {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) return DEFAULT_DAYS;
    return Math.min(Math.max(parsed, MIN_DAYS), MAX_DAYS);
}

export async function getMetricHistory(req: Request, res: Response): Promise<void> {
    const metric = req.params.metric as string;
    // Object.hasOwn, not `in`: `in` also matches inherited properties like
    // "constructor", which would crash trying to use it as a Mongoose model.
    if (!Object.hasOwn(MODELS, metric)) {
        res.status(404).json({ message: 'Unknown metric' });
        return;
    }

    const days =    clampDays(req.query.days);
    const model =   MODELS[metric as keyof typeof MODELS];
    const { total, history } = await dailyHistory(model, days);
    
    res.json({ metric, days, total, history });
}