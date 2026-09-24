import mongoose, { Schema, Document } from 'mongoose';

/** Single-document atomic counters, incremented with $inc so concurrent
 * registrations can't both read the same count before either writes it back
 * (see auth.controller.ts, 'founding-members'). */
export interface IPromoCounter extends Document<string> {
    count: number;
}

const PromoCounterSchema = new Schema<IPromoCounter>({
    _id:   { type: String, required: true },
    count: { type: Number, default: 0 },
});

export const PromoCounter = mongoose.model<IPromoCounter>('PromoCounter', PromoCounterSchema);
