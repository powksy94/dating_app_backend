import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Admin } from '../models/admin.model.js';
import { logger } from '../config/logger.js';

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
    logger.error('Usage: npm run change-admin-password -- admin@nocturne.com nouveauMotDePasse');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI!);

const admin = await Admin.findOne({ email });
if (!admin) {
    logger.error(`Aucun admin trouvé avec l'email : ${email}`);
    await mongoose.disconnect();
    process.exit(1);
}

admin.passwordHash = await bcrypt.hash(newPassword, 12);
await admin.save();

logger.info(`Mot de passe mis à jour pour : ${email}`);
await mongoose.disconnect();
