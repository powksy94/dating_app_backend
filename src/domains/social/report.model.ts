import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
    /** Absent for an automatic report (source "auto"). */
    reporter?: mongoose.Types.ObjectId;
    reported: mongoose.Types.ObjectId;
    reason:   string;
    /** "user": reported by a person. "auto": raised by the server. */
    source:   'user' | 'auto';
    /** What an automatic report is about (for example "bio"), to avoid duplicates. */
    topic?:   string;
}

const ReportSchema = new Schema<IReport>({
    reporter: { type: Schema.Types.ObjectId, ref: 'User' },
    reported: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason:   { type: String, required: true },
    source:   { type: String, enum: ['user', 'auto'], default: 'user' },
    topic:    { type: String },
}, { timestamps: true });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
