import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
    reporter: mongoose.Types.ObjectId;
    reported: mongoose.Types.ObjectId;
    reason:   string;
}

const ReportSchema = new Schema<IReport>({
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reported: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason:   { type: String, required: true },
}, { timestamps: true });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
