import mongoose, { Schema, Document } from "mongoose";
import { FavoriteBand } from "./band-name.js";

export interface IProfile extends Document {
    owner:              mongoose.Types.ObjectId;
    username:           string;
    avatarUrl:          string;
    photos:             string[];                 
    bio:                string;
    age?:               number;
    pronouns?:          string;
    musicsGenres:       string[];
    musicsVibes:        string[];
    aesthetics:         string[];
    soundIntensity:     string[];
    musicEras:          string[];
    discoveryFormats:   string[];
    favoriteBands:      FavoriteBand[];
    upcomingEvents:     string[];
    socialLinks:        Map<string, string>;
    location?:          { type: 'Point'; coordinates: [number, number] };
    birthDate?:         Date;
    gender?:            string;
    genderPreferences?: string[];
    ageMin?:            number;
    ageMax?:            number;
    maxDistance?:       number;
    profileComplete?:   boolean;
    /** Duplicated from User at registration so the discovery feed can filter on
     * it without a lookup. Never set by the client. */
    isTestAccount:      boolean;
}

const ProfileSchema = new Schema<IProfile>({
    owner:              { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    username:           { type: String, required: true },
    avatarUrl:          { type: String, default: '' },
    photos:             [{ type: String}],
    bio:                { type: String, default: '' },
    age:                { type: Number },
    pronouns:           { type: String },
    musicsGenres:       [String],
    musicsVibes:        [String],
    aesthetics:         [String],
    soundIntensity:     [String],
    musicEras:          [String],
    discoveryFormats:   [String],
    // A plain typed name has only `name`; one picked from Spotify search also
    // carries `imageUrl` and `spotifyId` (see band-name.ts, sanitizeFavoriteBands).
    // `_id: false`: a favorite band is a value, not an entity worth its own id.
    favoriteBands: [{
        _id:       false,
        name:      { type: String, required: true },
        imageUrl:  { type: String },
        spotifyId: { type: String },
    }],
    upcomingEvents:     [String],
    socialLinks:        { type: Map, of: String, default: {} },
    birthDate:          { type: Date },
    gender:             { type: String },
    genderPreferences:  [String],
    ageMin:             { type: Number, default: 18 },
    ageMax:             { type: Number, default: 99 },
    maxDistance:        { type: Number, default: 50 },
    profileComplete:    { type: Boolean, default: false },
    isTestAccount:      { type: Boolean, default: false },
    location: {
        type:           { type: String, enum: ['Point']},
        coordinates:    { type: [Number] },
    },
}, { timestamps: true });

// Geospatial index for proximity search
ProfileSchema.index({ location: '2dsphere' }, { sparse: true });

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);