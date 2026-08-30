import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Admin } from '../../domains/admin/admin.model.js';
import { User } from '../../shared/models/user.model.js';
import { logger } from '../config/logger.js';

const [,, email, password, linkedUserId] = process.argv;

if (!email || !password || !linkedUserId) {
    logger.error('Usage: npm run create-admin -- admin@nocturne.com monMotDePasse <userId du compte mobile>');
    logger.error('Le userId doit être celui d\'un compte mobile déjà enregistré avec cet email : c\'est');
    logger.error('l\'appareil qui recevra la notification push d\'approbation de connexion.');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI!);
logger.info('Mongo connecté');

const exists = await Admin.findOne({ email });
if (exists) {
    logger.error('Un admin avec cet email existe déjà.');
    await mongoose.disconnect();
    process.exit(1);
}

const linkedUser = await User.findById(linkedUserId);
if (!linkedUser) {
    logger.error('Aucun compte mobile trouvé avec ce userId.');
    await mongoose.disconnect();
    process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
await Admin.create({ email, passwordHash, linkedUserId });

logger.info(`Admin créé : ${email}, lié au compte mobile ${linkedUser.email}`);
await mongoose.disconnect();