import { Request, Response } from "express";
import { User } from "../../../shared/models/user.model.js";
import { Profile } from "../../profile/profile.model.js";
import { Like } from "../../discovery/like.model.js";
import { Match } from "../../match/match.model.js";
import { Message } from "../../chat/message.model.js";
import { dailyHistory } from "./daily-history.js";
import { realAccountsFilters, StatsMetric } from "./real-accounts-filter.js";
import { parsePeriod } from "./period.js";
import { daysSinceLaunch } from "./app-launch.js";

const MODELS = {
    users:      User,
    profiles:   Profile,
    likes:      Like,
    matches:    Match,
    messages:   Message,
};

export async function getMetricHistory(req: Request, res: Response): Promise<void> {
    const metric = req.params.metric as string;
    // Object.hasOwn, not `in`: `in` also matches inherited properties like
    // "constructor", which would crash trying to use it as a Mongoose model.
    if (!Object.hasOwn(MODELS, metric)) {
        res.status(404).json({ message: 'Unknown metric' });
        return;
    }

    const period = parsePeriod(req.query.days);
    const days =   period === 'all' ? await daysSinceLaunch() : period;
    const model =   MODELS[metric as keyof typeof MODELS];
    const filters = await realAccountsFilters();
    const { total, history } = await dailyHistory(model, days, filters[metric as StatsMetric]);
    
    res.json({ metric, days, total, history });
}