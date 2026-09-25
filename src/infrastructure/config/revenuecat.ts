import { logger } from './logger.js';

const secretApiKey = process.env.REVENUECAT_SECRET_API_KEY;

if (!secretApiKey) {
    logger.warn('REVENUECAT_SECRET_API_KEY manquant — l\'octroi d\'entitlement promotionnel est désactivé.');
}

/** True once a RevenueCat secret API key is configured; without it, granting
 * a promotional entitlement is a no-op (see claimFoundingMemberReward). */
export const revenueCatConfigured = Boolean(secretApiKey);

export type Period = 'week' | 'month' | 'year';

// Google Play products reach us as "<subscriptionId>:<basePlanId>" (e.g.
// "nocturne_weekly:weekly"), so the period can't be read from a fixed suffix.
export function periodFromProductId(productId: string | undefined): Period {
    if (productId?.includes('weekly'))  return 'week';
    if (productId?.includes('yearly'))  return 'year';
    return 'month';
}

interface EntitlementCheck {
    active:     boolean;
    productId?: string;
}

/** Reads this customer's current entitlements straight from RevenueCat, so
 * the backend never has to trust a client-reported plan (see subscription.controller.ts
 * `subscribe`). https://www.revenuecat.com/docs/api-v1 — GET subscribers/{app_user_id} */
export async function fetchActiveEntitlement(appUserId: string, entitlementId: string): Promise<EntitlementCheck> {
    if (!secretApiKey) return { active: false };
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { 'Authorization': `Bearer ${secretApiKey}` },
    });
    if (!res.ok) return { active: false };

    const data = await res.json() as {
        subscriber?: { entitlements?: Record<string, { expires_date: string | null; product_identifier: string }> };
    };
    const entitlement = data.subscriber?.entitlements?.[entitlementId];
    if (!entitlement) return { active: false };

    const active = !entitlement.expires_date || new Date(entitlement.expires_date) > new Date();
    return { active, productId: entitlement.product_identifier };
}

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
