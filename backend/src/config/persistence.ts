import { NextFunction, Request, Response } from 'express';
import { get, put } from '@vercel/blob';
import { db } from './db';

/**
 * Persistencia del estado para el despliegue serverless: cada pedido puede caer en
 * una instancia distinta de la función, así que la memoria local no alcanza para
 * que el celular del menor vea la cuenta que el adulto creó desde la web.
 *
 * Usa Redis (Upstash, vía su API REST) si están KV_REST_API_URL/TOKEN; si no,
 * un blob privado de Vercel Blob (BLOB_READ_WRITE_TOKEN), leído sin caché para
 * que cada lectura vea la última escritura.
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

const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN;
const blobPath = () => `${stateKey().replace(/:/g, '/')}.json`;

const useRedis = () => Boolean(redisUrl() && redisToken());

export const isPersistenceEnabled = (): boolean =>
  process.env.NODE_ENV !== 'test' && (useRedis() || Boolean(blobToken()));

async function readRaw(): Promise<string | null> {
  if (useRedis()) {
    const raw = await redis(['GET', stateKey()]);
    return typeof raw === 'string' ? raw : null;
  }
  try {
    // useCache: false lee siempre la última versión (con caché, otra instancia veía datos viejos).
    const blob = await get(blobPath(), { access: 'private', token: blobToken(), useCache: false });
    if (!blob || !blob.stream) return null;
    return await new Response(blob.stream).text();
  } catch (error) {
    // Primer arranque: todavía no se guardó ningún estado.
    if (error instanceof Error && /not.?found/i.test(error.name + error.message)) return null;
    throw error;
  }
}

async function writeRaw(value: string): Promise<void> {
  if (useRedis()) {
    await redis(['SET', stateKey(), value]);
    return;
  }
  await put(blobPath(), value, {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    token: blobToken()
  });
}

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
  const raw = await readRaw();
  if (raw) {
    applySnapshot(JSON.parse(raw) as Snapshot);
  }
}

export async function saveState(): Promise<void> {
  if (!isPersistenceEnabled()) return;
  await writeRaw(JSON.stringify(toSnapshot()));
}

/**
 * Candado por instancia: los pedidos se atienden de a uno. Sin esto, un pedido que
 * recarga el estado reemplaza los arrays de `db` mientras otro todavía está
 * trabajando (por ejemplo, esperando el hash del PIN) y ese cambio se pierde.
 */
let queue: Promise<void> = Promise.resolve();

function acquireLock(): Promise<() => void> {
  let release!: () => void;
  const turn = new Promise<void>(resolve => {
    release = resolve;
  });
  const ready = queue.then(() => release);
  queue = queue.then(() => turn);
  return ready;
}

/**
 * Middleware: sincroniza el estado con el almacenamiento alrededor de cada pedido.
 * Si no responde, el pedido falla con 503 en lugar de trabajar con datos viejos.
 */
export const persistState = async (req: Request, res: Response, next: NextFunction) => {
  if (!isPersistenceEnabled()) return next();

  const release = await acquireLock();
  let released = false;
  const releaseOnce = () => {
    if (!released) {
      released = true;
      release();
    }
  };
  // Si el cliente corta la conexión, el turno se libera igual.
  res.on('close', releaseOnce);

  try {
    await loadState();
  } catch (error) {
    console.error('[persistence] no se pudo leer el estado', error);
    res.status(503).json({ error: 'Servicio no disponible. Intentá de nuevo en unos minutos.' });
    releaseOnce();
    return;
  }

  const originalEnd = res.end.bind(res) as (...args: unknown[]) => Response;
  (res as unknown as { end: (...args: unknown[]) => Response }).end = (...args: unknown[]) => {
    const done = () => {
      originalEnd(...args);
      releaseOnce();
    };
    if (!MUTATING.has(req.method) || res.statusCode >= 400) {
      done();
    } else {
      saveState()
        .catch(error => console.error('[persistence] no se pudo guardar el estado', error))
        .finally(done);
    }
    return res;
  };

  next();
};
