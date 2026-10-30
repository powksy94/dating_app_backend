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
    /** Set when this report was filed from a specific chat message (the
     * "report this message" entry point, as opposed to reporting the
     * account in general). */
    messageId?: mongoose.Types.ObjectId;
    /** The message's text, captured at report time so it survives the
     * message later being deleted (for either side or for all). */
    messageSnapshot?: string;
}

const ReportSchema = new Schema<IReport>({
    reporter: { type: Schema.Types.ObjectId, ref: 'User' },
    reported: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason:   { type: String, required: true },
    source:   { type: String, enum: ['user', 'auto'], default: 'user' },
    topic:    { type: String },
    messageId:       { type: Schema.Types.ObjectId, ref: 'Message' },
    messageSnapshot: { type: String },
}, { timestamps: true });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
