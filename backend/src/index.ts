// Primero el .env: auth.middleware lee JWT_SECRET (y frena el arranque en
// producción si falta) apenas se importa, antes que el resto del módulo.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import blocklistRoutes from './routes/blocklist.routes';
import eventRoutes from './routes/event.routes';
import feedbackRoutes from './routes/feedback.routes';
import { persistState } from './config/persistence';

/**
 * Qué proxies se aceptan para calcular req.ip, que usa el límite de intentos de
 * POST /api/devices/claim. En Vercel hay uno (su borde reescribe X-Forwarded-For).
 * Sin proxy delante (desarrollo, WSL expuesto a la LAN, `npm start` en un
 * servidor), X-Forwarded-For lo manda el cliente: confiar en él permitiría
 * esquivar el límite cambiándolo en cada pedido, así que se usa la IP del socket.
 * TRUST_PROXY lo fija a mano: un número de saltos, "true"/"false" o una lista de
 * IPs/subredes, igual que el `trust proxy` de Express.
 */
export const trustProxySetting = (
  env: NodeJS.ProcessEnv = process.env
): boolean | number | string => {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw) return env.VERCEL ? 1 : false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
};

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', trustProxySetting());

app.use(cors());
app.use(express.json());
// Estado compartido entre instancias serverless (Redis). Sin configurar, no hace nada.
app.use('/api', persistState);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/blocklist', blocklistRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/feedback', feedbackRoutes);

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
