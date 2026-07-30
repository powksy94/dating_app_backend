import mongoose, { Schema, Document } from 'mongoose';

export interface IEventPayment extends Document {
    event:                  mongoose.Types.ObjectId;
    user:                   mongoose.Types.ObjectId;
    stripePaymentIntentId:  string;
    amount:                 number;
    status:                 'pending' | 'succeeded' | 'failed';
}

const EventPaymentSchema = new Schema<IEventPayment>({
    event:                 { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    user:                  { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    amount:                { type: Number, required: true },
    status:                { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
}, { timestamps: true });

EventPaymentSchema.index({ event: 1, user: 1 });

export const EventPayment = mongoose.model<IEventPayment>('EventPayment', EventPaymentSchema);
