import mongoose, { Schema, Document } from 'mongoose';

export interface IVisit extends Document {
    visitor:   mongoose.Types.ObjectId;
    visited:   mongoose.Types.ObjectId;
    visitedAt: Date;
}

const VisitSchema = new Schema<IVisit>({
    visitor:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visited:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitedAt: { type: Date, default: Date.now },
});

VisitSchema.index({ visited: 1, visitedAt: -1 });
VisitSchema.index({ visitor: 1, visited: 1 }, { unique: true });

export const Visit = mongoose.model<IVisit>('Visit', VisitSchema);
