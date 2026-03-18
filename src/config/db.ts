import mongoose from "mongoose";
import { logger } from './logger.js';

export async function connectDB(): Promise<void> {
    const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/nocturne';
    await mongoose.connect(uri);
    logger.info(`MongoDB connecté : ${uri}`);
}