import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Admin } from "./admin.model.js";
import { User } from "../../shared/models/user.model.js";
import { Profile } from "../profile/profile.model.js";
import { Like } from "../discovery/like.model.js";
import { Match } from "../match/match.model.js";
import { Message } from "../chat/message.model.js";
import { logger } from "../../infrastructure/config/logger.js";
import { realAccountsFilters, MongoFilter } from "./stats/real-accounts-filter.js";

export async function adminLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'email and password are required' });
        return;
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
        logger.warn(`Tentative de connexion admin échouée : ${email}`);
        res.status(401).json({ message: 'Invalid credentials' });
        return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
        logger.warn(`Mot de passe incorrect pour admin : ${email}`);
        res.status(401).json({ message: 'Invalid credentials' });
        return;
    }

    const token = jwt.sign(
        { adminId: admin._id, role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any }
    );

    logger.info(`Admin connecté : ${email}`);
    res.json({ token, adminId: admin._id });
}

const HISTORY_PIPELINE = (since: Date, filter: MongoFilter) => [
    { $match: { ...filter, createdAt: { $gte: since } } },
    { $group: {
        _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Paris' } },
        value: { $sum: 1 },
    }},
    { $sort: { _id: 1 as const } },
    { $project: { _id: 0, date: '$_id', value: 1 } },
];

function fillHistory(
    rows: { date: string; value: number }[],
    since: Date,
): { date: string; value: number }[] {
    const map = new Map(rows.map(r => [r.date, r.value]));
    const out: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d   = new Date(since.getTime() + (6 - i) * 86_400_000);
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, value: map.get(key) ?? 0 });
    }
    return out;
}

export async function getStats(_req: Request, res: Response): Promise<void> {
    const now = new Date();
    const d7  = new Date(now.getTime() -  7 * 86_400_000);
    const d30 = new Date(now.getTime() - 30 * 86_400_000);
    const d60 = new Date(now.getTime() - 60 * 86_400_000);

    const filters = await realAccountsFilters();

    // Adds the createdAt range on top of a metric's real-accounts filter —
    // avoids repeating { ...filter, createdAt: {...} } at every call site below.
    const last30 = (filter: MongoFilter) => ({ ...filter, createdAt: { $gte: d30 } });
    const prev30 = (filter: MongoFilter) => ({ ...filter, createdAt: { $gte: d60, $lt: d30 } });

    const [
        users, profiles, likes, matches, messages,
        usersLast30,   usersPrev30,
        likesLast30,   likesPrev30,
        matchesLast30, matchesPrev30,
        messagesLast30, messagesPrev30,
        usersHist, likesHist, matchesHist, messagesHist,
    ] = await Promise.all([
        User.countDocuments(filters.users),
        Profile.countDocuments(filters.profiles),
        Like.countDocuments(filters.likes),
        Match.countDocuments(filters.matches),
        Message.countDocuments(filters.messages),
        User.countDocuments(last30(filters.users )),
        User.countDocuments(prev30(filters.users )),
        Like.countDocuments(last30(filters.likes )),
        Like.countDocuments(prev30(filters.likes )),
        Match.countDocuments(last30(filters.matches )),
        Match.countDocuments(prev30(filters.matches )),
        Message.countDocuments(last30(filters.messages )),
        Message.countDocuments(prev30(filters.messages )),
        User.aggregate(HISTORY_PIPELINE(d7, filters.users)),
        Like.aggregate(HISTORY_PIPELINE(d7, filters.likes)),
        Match.aggregate(HISTORY_PIPELINE(d7, filters.matches)),
        Message.aggregate(HISTORY_PIPELINE(d7, filters.messages)),
    ]);

    function trend(current: number, prev: number, hist: { date: string; value: number }[], label = 'ce mois') {
        const delta        = current - prev;
        const deltaPercent = prev === 0
            ? (current > 0 ? 100 : 0)
            : Math.round((delta / prev) * 100);
        const history = fillHistory(hist, d7);
        const hasData = history.some(h => h.value > 0);
        return {
            deltaPercent,
            delta,
            secondaryValue: current,
            secondaryLabel: `${delta >= 0 ? '+' : ''}${delta} ${label}`,
            ...(hasData ? { history } : {}),
        };
    }

    logger.info('Stats admin consultées');
    res.json({
        users, profiles, likes, matches, messages,
        trends: {
            users:    trend(usersLast30,    usersPrev30,    usersHist),
            likes:    trend(likesLast30,    likesPrev30,    likesHist),
            matches:  trend(matchesLast30,  matchesPrev30,  matchesHist),
            messages: trend(messagesLast30, messagesPrev30, messagesHist),
        },
    });
}