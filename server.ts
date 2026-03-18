import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { logger } from './src/config/logger.js';
import { errorHandler } from './src/middleware/error.middleware.js';

import authRoutes       from './src/routes/auth.routes.js';
import profileRoutes    from './src/routes/profile.routes.js';
import swipeRoutes      from './src/routes/swipe.routes.js';
import matchRoutes      from './src/routes/match.routes.js';
import chatRoutes       from './src/routes/chat.routes.js';
import adminRoutes      from './src/routes/admin.routes.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/admin', express.static('admin-ui'));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'nocturne' }))

app.use(errorHandler);

connectDB().then(() => {
    app.listen(PORT, () => logger.info(`Nocturne backend running on port ${PORT}`));
});