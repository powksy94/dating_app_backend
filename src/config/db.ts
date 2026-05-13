import mongoose from "mongoose";
import { logger } from './logger.js';

export async function connectDB(): Promise<void> {
    const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/nocturne';

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB déconnecté — reconnexion automatique en cours...');
    });

    mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnecté');
    });

    mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB erreur : ${err}`);
    });

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS:          45000,
        maxPoolSize:              10,
    });

    logger.info('MongoDB connecté');
}
