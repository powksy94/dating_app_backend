import mongoose, { Schema, Document } from 'mongoose';

/**
 * A user's connected Discord account. Kept in its own collection, never
 * embedded in User or Profile: those documents are read and returned to the
 * client in several places, and a future `.select()` mistake there must not
 * be able to leak an encrypted token. `accessToken`/`refreshToken` are always
 * encrypted (see token-encryption.ts) and must never be sent to the client;
 * only externalId/username/avatarUrl are.
 */
export interface IDiscordConnection extends Document {
    owner:        mongoose.Types.ObjectId;
    externalId:   string;
    username:     string;
    avatarUrl?:   string;
    accessToken:  string;
    refreshToken: string;
    expiresAt:    Date;
}

const DiscordConnectionSchema = new Schema<IDiscordConnection>({
    owner:        { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    externalId:   { type: String, required: true },
    username:     { type: String, required: true },
    avatarUrl:    { type: String },
    accessToken:  { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt:    { type: Date, required: true },
}, { timestamps: true });

export const DiscordConnection = mongoose.model<IDiscordConnection>('DiscordConnection', DiscordConnectionSchema);
