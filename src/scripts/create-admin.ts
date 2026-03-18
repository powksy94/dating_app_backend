import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Admin } from '../models/admin.model.js';
import { logger } from '../config/logger.js';

const [,, email, password] = process.argv;

if (!email || !password) {
    logger.error('Usage: npm run create-admin -- admin@nocturne.com monMotDePasse');
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

const passwordHash =  await bcrypt.hash(password, 12);
await Admin.create({ email, passwordHash });

logger.info(`Admin créé : ${email}`);
await mongoose.disconnect();