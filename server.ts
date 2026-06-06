import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initSocket } from './src/infrastructure/socket/socket.js';
import { connectDB } from './src/infrastructure/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { logger } from './src/infrastructure/config/logger.js';
import { errorHandler } from './src/shared/middleware/error.middleware.js';

import authRoutes           from './src/domains/auth/auth.routes.js';
import profileRoutes        from './src/domains/profile/profile.routes.js';
import swipeRoutes          from './src/domains/discovery/swipe.routes.js';
import matchRoutes          from './src/domains/match/match.routes.js';
import chatRoutes           from './src/domains/chat/chat.routes.js';
import adminRoutes          from './src/domains/admin/admin.routes.js';
import adminAuthRoutes      from './src/domains/admin/admin-auth.routes.js';
import devRoutes            from './src/domains/dev/dev.routes.js';
import subscriptionRoutes   from './src/domains/subscription/subscription.routes.js';
import elegieRoutes         from './src/domains/elegie/elegie.routes.js';
import eventRoutes          from './src/domains/event/event.routes.js';
import userRoutes           from './src/domains/social/user.routes.js';
import boostRoutes          from './src/domains/subscription/boost.routes.js';
import visitRoutes          from './src/domains/visit/visit.routes.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/admin',   express.static(join(__dirname, 'admin-ui')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
if (process.env.NODE_ENV !== 'production') app.use('/api/dev', devRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/elegie',       elegieRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users',  userRoutes);
app.use('/api/boost',  boostRoutes);
app.use('/api/visits', visitRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'nocturne' }))

app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

connectDB().then(() => {
    httpServer.listen(PORT, () => logger.info(`Nocturne backend running on port ${PORT}`));
});