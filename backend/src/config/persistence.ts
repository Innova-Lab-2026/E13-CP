import { NextFunction, Request, Response } from 'express';
import { db } from './db';

/**
 * Persistencia del estado en Redis (Upstash, vía su API REST) para el despliegue
 * serverless: cada pedido puede caer en una instancia distinta de la función, así
 * que la memoria local no alcanza para que el celular del menor vea la cuenta que
 * el adulto creó desde la web.
 *
 * Sin variables de entorno (desarrollo local y tests) queda desactivada y el
 * backend sigue usando solo la memoria, como hasta ahora.
 *
 * Estrategia del MVP: antes de cada pedido se lee el estado completo y, si el
 * pedido modificó datos, se guarda antes de enviar la respuesta (la función se
 * congela al responder). Ante dos escrituras simultáneas gana la última.
 */

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Se leen en cada uso (y no al importar) para respetar el .env que carga index.ts.
const redisUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const stateKey = () => process.env.STATE_KEY || 'baprotege:state:v1';

export const isPersistenceEnabled = (): boolean =>
  process.env.NODE_ENV !== 'test' && Boolean(redisUrl() && redisToken());

type Snapshot = {
  responsables: typeof db.responsables;
  devices: typeof db.devices;
  events: typeof db.events;
  alerts: typeof db.alerts;
  blocklistSyncLog: typeof db.blocklistSyncLog;
  /**
   * Dominios personalizados. La lista oficial se toma del código salvo que se
   * haya sincronizado un período nuevo: en ese caso se guarda completa.
   */
  blocklist: typeof db.blocklist;
};

async function redis(command: (string | number)[]): Promise<unknown> {
  const response = await fetch(redisUrl() as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!response.ok) {
    throw new Error(`Redis respondió ${response.status}`);
  }
  const data = (await response.json()) as { result?: unknown; error?: string };
  if (data.error) {
    throw new Error(`Redis: ${data.error}`);
  }
  return data.result;
}

function toSnapshot(): Snapshot {
  const officialWasSynced = db.blocklistSyncLog.length > 0;
  return {
    responsables: db.responsables,
    devices: db.devices,
    events: db.events,
    alerts: db.alerts,
    blocklistSyncLog: db.blocklistSyncLog,
    blocklist: officialWasSynced ? db.blocklist : db.blocklist.filter(item => item.type === 'CUSTOM')
  };
}

const officialFromSource = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');

function applySnapshot(snapshot: Snapshot): void {
  db.responsables = snapshot.responsables ?? [];
  db.devices = snapshot.devices ?? [];
  db.events = snapshot.events ?? [];
  db.alerts = snapshot.alerts ?? [];
  db.blocklistSyncLog = snapshot.blocklistSyncLog ?? [];
  const stored = snapshot.blocklist ?? [];
  db.blocklist = db.blocklistSyncLog.length > 0 ? stored : [...officialFromSource, ...stored];
}

export async function loadState(): Promise<void> {
  if (!isPersistenceEnabled()) return;
  const raw = await redis(['GET', stateKey()]);
  if (typeof raw === 'string' && raw) {
    applySnapshot(JSON.parse(raw) as Snapshot);
  }
}

export async function saveState(): Promise<void> {
  if (!isPersistenceEnabled()) return;
  await redis(['SET', stateKey(), JSON.stringify(toSnapshot())]);
}

/**
 * Middleware: sincroniza el estado con Redis alrededor de cada pedido.
 * Si Redis no responde, el pedido falla con 503 en lugar de trabajar con datos viejos.
 */
export const persistState = async (req: Request, res: Response, next: NextFunction) => {
  if (!isPersistenceEnabled()) return next();

  try {
    await loadState();
  } catch (error) {
    console.error('[persistence] no se pudo leer el estado', error);
    return res.status(503).json({ error: 'Servicio no disponible. Intentá de nuevo en unos minutos.' });
  }

  if (MUTATING.has(req.method)) {
    const originalEnd = res.end.bind(res) as (...args: unknown[]) => Response;
    (res as unknown as { end: (...args: unknown[]) => Response }).end = (...args: unknown[]) => {
      const done = () => originalEnd(...args);
      if (res.statusCode >= 400) {
        done();
      } else {
        saveState()
          .catch(error => console.error('[persistence] no se pudo guardar el estado', error))
          .finally(done);
      }
      return res;
    };
  }

  next();
};
