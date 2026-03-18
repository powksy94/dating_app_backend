import mongoose, { Schema, Document } from "mongoose";

export interface IProfile extends Document {
    owner:              mongoose.Types.ObjectId;
    username:           string;
    avatarUrl:          string;
    bio:                string;
    age?:               number;
    pronouns?:          string;
    musicsGenres:       string[];
    musicsVibes:        string[];
    aesthetics:         string[];
    soundIntensity:     string[];
    musicEras:          string[];
    discoveryFormats:   string[];
    favoriteBands:      string[];
    upcomingEvents:     string[];
    socialLinks:        Map<string, string>;
    location?:          { type: 'Point'; coordinates: [number, number] };
    
}

const ProfileSchema = new Schema<IProfile>({
    owner:              { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    username:           { type: String, required: true },
    avatarUrl:          { type: String, default: '' },
    bio:                { type: String, default: '' },
    age:                { type: Number },
    pronouns:           { type: String },
    musicsGenres:       [String],
    musicsVibes:        [String],
    aesthetics:         [String],
    soundIntensity:     [String],
    musicEras:          [String],
    discoveryFormats:   [String],
    favoriteBands:      [String],
    upcomingEvents:     [String],
    socialLinks:        { type: Map, of: String, default: {} },
    location: {
        type:           { type: String, enum: ['Point']},
        coordinates:    { type: [Number] },
    },
}, { timestamps: true });

// Index géospatial pour la recherche par proximité
ProfileSchema.index({ location: '2dsphere' }, { sparse: true });

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);