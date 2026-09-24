import { logger } from './logger.js';

const secretApiKey = process.env.REVENUECAT_SECRET_API_KEY;

if (!secretApiKey) {
    logger.warn('REVENUECAT_SECRET_API_KEY manquant — l\'octroi d\'entitlement promotionnel est désactivé.');
}

/** True once a RevenueCat secret API key is configured; without it, granting
 * a promotional entitlement is a no-op (see claimFoundingMemberReward). */
export const revenueCatConfigured = Boolean(secretApiKey);

/** Grants a promotional entitlement to a customer, ending at [endTimeMs]
 * (epoch ms). Returns true once RevenueCat confirms the grant.
 * https://www.revenuecat.com/docs/api-v1 — subscribers/{app_user_id}/entitlements/{id}/promotional */
export async function grantPromotionalEntitlement(
    appUserId: string,
    entitlementIdentifier: string,
    endTimeMs: number,
): Promise<boolean> {
    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(entitlementIdentifier)}/promotional`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${secretApiKey}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ end_time_ms: endTimeMs }),
    });
    if (!res.ok) {
        logger.error(`RevenueCat: échec de l'octroi promotionnel pour ${appUserId} (${res.status})`);
        return false;
    }
    return true;
}
