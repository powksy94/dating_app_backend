import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { generatePkcePair } from '../../shared/services/pkce.js';
import { encryptToken, decryptToken } from '../../shared/services/token-encryption.js';
import {
    discordConfigured, buildDiscordAuthorizeUrl, exchangeDiscordCode,
    refreshDiscordToken, getDiscordIdentity, revokeDiscordToken, DiscordTokens,
} from '../../infrastructure/config/discord.js';
import { DiscordConnection } from './discord-connection.model.js';

interface PendingFlow {
    userId:       string;
    codeVerifier: string;
    expiresAt:    number;
}

// Keyed by `state`: only this server instance needs to recall it, for the few
// seconds between opening the browser and Discord redirecting back.
const pendingFlows = new Map<string, PendingFlow>();
const FLOW_TTL_MS = 5 * 60 * 1000;

function cleanupExpiredFlows() {
    const now = Date.now();
    for (const [state, flow] of pendingFlows) {
        if (flow.expiresAt < now) pendingFlows.delete(state);
    }
}
setInterval(cleanupExpiredFlows, 60_000);

export async function startDiscordAuth(req: AuthRequest, res: Response): Promise<void> {
    if (!discordConfigured) { res.status(503).json({ message: 'Discord connection unavailable' }); return; }

    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = randomUUID();
    cleanupExpiredFlows();
    pendingFlows.set(state, { userId: req.userId!, codeVerifier, expiresAt: Date.now() + FLOW_TTL_MS });

    res.json({ authorizeUrl: buildDiscordAuthorizeUrl(state, codeChallenge) });
}

async function saveConnection(userId: string, tokens: DiscordTokens): Promise<{ username: string; avatarUrl: string | null } | null> {
    const identity = await getDiscordIdentity(tokens.accessToken);
    if (!identity) return null;

    await DiscordConnection.findOneAndUpdate(
        { owner: userId },
        {
            owner:        userId,
            externalId:   identity.id,
            username:     identity.username,
            avatarUrl:    identity.avatarUrl ?? undefined,
            accessToken:  encryptToken(tokens.accessToken),
            refreshToken: encryptToken(tokens.refreshToken),
            expiresAt:    tokens.expiresAt,
        },
        { upsert: true },
    );
    return { username: identity.username, avatarUrl: identity.avatarUrl };
}

export async function completeDiscordAuth(req: AuthRequest, res: Response): Promise<void> {
    const { code, state } = req.body as { code?: string; state?: string };
    if (typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).json({ message: 'code and state are required' });
        return;
    }

    const flow = pendingFlows.get(state);
    // The state also ties this callback to the session that started it: a
    // stolen/guessed state alone is not enough to attach a connection to
    // someone else's account.
    if (!flow || flow.userId !== req.userId) {
        res.status(400).json({ message: 'Invalid or expired authorization attempt' });
        return;
    }
    pendingFlows.delete(state);

    const tokens = await exchangeDiscordCode(code, flow.codeVerifier);
    if (!tokens) { res.status(400).json({ message: 'Discord refused this authorization code' }); return; }

    const identity = await saveConnection(req.userId!, tokens);
    if (!identity) { res.status(502).json({ message: 'Could not read the Discord identity' }); return; }

    res.json({ connected: true, ...identity });
}

/** A valid, non-expired access token for this user's connection, refreshing
 * it first if needed. Null when there is no connection, or it could not be
 * refreshed (revoked on Discord's side): the caller should treat that as
 * disconnected rather than retrying. */
export async function getValidDiscordAccessToken(userId: string): Promise<string | null> {
    const connection = await DiscordConnection.findOne({ owner: userId });
    if (!connection) return null;

    if (connection.expiresAt.getTime() > Date.now()) {
        return decryptToken(connection.accessToken);
    }

    const refreshed = await refreshDiscordToken(decryptToken(connection.refreshToken));
    if (!refreshed) {
        await DiscordConnection.deleteOne({ _id: connection._id });
        return null;
    }
    connection.accessToken  = encryptToken(refreshed.accessToken);
    connection.refreshToken = encryptToken(refreshed.refreshToken);
    connection.expiresAt    = refreshed.expiresAt;
    await connection.save();
    return refreshed.accessToken;
}

export async function getDiscordStatus(req: AuthRequest, res: Response): Promise<void> {
    const connection = await DiscordConnection.findOne({ owner: req.userId })
        .select('username avatarUrl');
    if (!connection) { res.json({ connected: false }); return; }
    res.json({ connected: true, username: connection.username, avatarUrl: connection.avatarUrl ?? null });
}

export async function disconnectDiscord(req: AuthRequest, res: Response): Promise<void> {
    const connection = await DiscordConnection.findOne({ owner: req.userId });
    if (connection) {
        await revokeDiscordToken(decryptToken(connection.refreshToken));
        await DiscordConnection.deleteOne({ _id: connection._id });
    }
    res.json({ connected: false });
}
