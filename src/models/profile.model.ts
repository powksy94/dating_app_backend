import mongoose, { Schema, Document } from "mongoose";

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
    favoriteBands:      string[];
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
    favoriteBands:      [String],
    upcomingEvents:     [String],
    socialLinks:        { type: Map, of: String, default: {} },
    birthDate:          { type: Date },
    gender:             { type: String },
    genderPreferences:  [String],
    ageMin:             { type: Number, default: 18 },
    ageMax:             { type: Number, default: 99 },
    maxDistance:        { type: Number, default: 50 },
    profileComplete:    { type: Boolean, default: false },
    location: {
        type:           { type: String, enum: ['Point']},
        coordinates:    { type: [Number] },
    },
}, { timestamps: true });

// Index géospatial pour la recherche par proximité
ProfileSchema.index({ location: '2dsphere' }, { sparse: true });

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);