import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import blocklistRoutes from './routes/blocklist.routes';
import eventRoutes from './routes/event.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/blocklist', blocklistRoutes);
app.use('/api/events', eventRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'BA Protege+ Backend' });
});

// En Vercel la app corre como función serverless (ver api/index.js): no escucha un puerto.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`BA Protege+ Backend running on port ${PORT}`);
  });
}

export default app;
