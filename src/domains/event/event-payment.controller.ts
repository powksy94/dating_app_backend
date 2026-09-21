import { Request, Response } from 'express';
import type { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { stripe } from '../../infrastructure/config/stripe.js';
import { Event } from './event.model.js';
import { EventPayment } from './event-payment.model.js';
import { logger } from '../../infrastructure/config/logger.js';

export async function createPaymentIntent(req: AuthRequest, res: Response): Promise<void> {
    if (!stripe) { res.status(503).json({ message: 'Payment unavailable' }); return; }

    const event = await Event.findOne({ _id: req.params.id, status: 'approved' });
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }
    if (event.isFree || !event.price) { res.status(400).json({ message: 'This event is free' }); return; }
    if (event.attendees.some(a => a.equals(req.userId!))) {
        res.status(409).json({ message: 'Already registered' });
        return;
    }

    const intent = await stripe.paymentIntents.create({
        amount:   Math.round(event.price * 100),
        currency: 'eur',
        metadata: { eventId: String(event._id), userId: req.userId! },
    });

    await EventPayment.create({
        event:                 event._id,
        user:                  req.userId,
        stripePaymentIntentId: intent.id,
        amount:                event.price,
        status:                'pending',
    });

    res.json({ clientSecret: intent.client_secret });
}

export async function confirmPayment(req: AuthRequest, res: Response): Promise<void> {
    const { paymentIntentId } = req.body as { paymentIntentId?: string };
    if (!paymentIntentId) { res.status(400).json({ message: 'paymentIntentId is required' }); return; }

    const settled = await settlePayment(paymentIntentId);
    if (!settled) { res.status(400).json({ message: 'Payment not confirmed' }); return; }
    res.json({ message: 'Registration confirmed' });
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
    if (!stripe) { res.status(503).send('Paiement indisponible'); return; }

    const signature = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
        logger.warn('Stripe webhook signature invalide', { err });
        res.status(400).send('Signature invalide');
        return;
    }

    if (event.type === 'payment_intent.succeeded') {
        await settlePayment(event.data.object.id);
    }
    res.json({ received: true });
}

/// Verifies the PaymentIntent with Stripe and, if it succeeded, adds the user
/// to the event's attendees. Idempotent, callable by both the webhook and the client.
async function settlePayment(paymentIntentId: string): Promise<boolean> {
    if (!stripe) return false;

    const payment = await EventPayment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) return false;
    if (payment.status === 'succeeded') return true;

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') return false;

    payment.status = 'succeeded';
    await payment.save();
    await Event.findByIdAndUpdate(payment.event, { $addToSet: { attendees: payment.user } });
    return true;
}
