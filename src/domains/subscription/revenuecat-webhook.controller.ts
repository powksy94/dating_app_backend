import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../../shared/models/user.model.js';
import { logger } from '../../infrastructure/config/logger.js';

type Plan   = 'ombre' | 'nocturne' | 'abyssal';
type Period = 'week' | 'month' | 'year';

const VALID_PLANS: Plan[] = ['nocturne', 'abyssal'];

// Events that confirm an active paid access (purchase, renewal,
// cancellation reversal, tier change, account transfer).
const ACTIVE_EVENTS = new Set([
    'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'TRANSFER',
]);

// Only EXPIRATION means access is truly over. CANCELLATION just means
// auto-renewal was turned off, access continues until the expiration date,
// which will trigger EXPIRATION later.
const EXPIRATION_EVENTS = new Set(['EXPIRATION']);

// Google Play products reach us as "<subscriptionId>:<basePlanId>" (e.g.
// "nocturne_weekly:weekly"), so the period can't be read from a fixed suffix.
function periodFromProductId(productId: string | undefined): Period {
    if (productId?.includes('weekly'))  return 'week';
    if (productId?.includes('yearly'))  return 'year';
    return 'month';
}

export async function revenueCatWebhook(req: Request, res: Response): Promise<void> {
    const expected = `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`;
    if (!process.env.REVENUECAT_WEBHOOK_SECRET || req.headers.authorization !== expected) {
        res.status(401).json({ message: 'Non autorisé' });
        return;
    }

    const event = req.body?.event as {
        type?: string; app_user_id?: string;
        entitlement_ids?: string[]; product_id?: string;
    } | undefined;

    if (!event?.app_user_id || !mongoose.Types.ObjectId.isValid(event.app_user_id)) {
        // Test events or anonymous users (never identified on the app side): nothing to sync.
        res.status(200).json({ received: true });
        return;
    }

    if (EXPIRATION_EVENTS.has(event.type ?? '')) {
        await User.findByIdAndUpdate(event.app_user_id, {
            subscriptionPlan: 'ombre', subscriptionPeriod: 'month',
        });
    } else if (ACTIVE_EVENTS.has(event.type ?? '')) {
        const plan = event.entitlement_ids?.find((id): id is Plan => VALID_PLANS.includes(id as Plan));
        if (plan) {
            await User.findByIdAndUpdate(event.app_user_id, {
                subscriptionPlan:   plan,
                subscriptionPeriod: periodFromProductId(event.product_id),
            });
        }
    } else {
        logger.info(`RevenueCat webhook: événement ${event.type} ignoré (pas d'action nécessaire)`);
    }

    res.status(200).json({ received: true });
}
