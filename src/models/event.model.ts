import mongoose, { Schema, Document} from "mongoose";

export interface IEvent extends Document {
    title:          string;
    description:    string;
    date:           Date;
    city:           string;
    address:        string; 
    location:       { type: 'Point'; coordinates: [number, number] };
    genres:         string[];
    coverImageUrl:  string;
    creatorId:      mongoose.Types.ObjectId;
    attendees:      mongoose.Types.ObjectId[];
    capacityMin:    number;
    capacityMax?:   number;
    isFree:         boolean;
    price?:         number;
    status:         'pending' | 'approved' | 'rejected';
}

const EventSchema = new Schema<IEvent>({
    title:          { type: String, required: true, maxlength: 100 },
    description:    { type: String, required: true, maxlength: 500 },
    date:           { type: Date, required: true},
    city:           { type: String, required: true },
    address:        { type: String, required: true },
    location: {
        type:           { type: String, enum: ['Point'], required: true },
        coordinates:    { type: [Number], required: true },
    },
    genres:         [{ type: String }],
    coverImageUrl:  { type: String, default: '' },
    creatorId:      { type: Schema.Types.ObjectId, ref: 'User', required: true  },
    attendees:      [{ type: Schema.Types.ObjectId, ref: 'User' }],
    capacityMin:    { type: Number, required: true, min: 1 },
    capacityMax:    { type: Number },
    isFree:         { type: Boolean, default: true },
    price:          { type: Number, min: 0 },
    status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

EventSchema.index({ location: '2dsphere' });
EventSchema.index({ genres: 1 });
EventSchema.index({ status: 1, date: 1});

export const Event = mongoose.model<IEvent>('Event', EventSchema);