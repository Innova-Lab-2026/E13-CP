import { NextFunction, Request, Response } from 'express';
import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
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
 * congela al responder).
 *
 * La escritura es condicional (control de concurrencia optimista): solo se
 * guarda si nadie escribió desde que este pedido leyó el estado. En Redis se
 * compara un número de versión dentro de un script Lua (atómico); en Blob, el
 * ETag con `ifMatch`. Si otra instancia escribió en el medio, el pedido responde
 * 503 en lugar de pisar ese cambio: así, por ejemplo, un evento del celular que
 * llega a la vez que el adulto lo desvincula no restaura la credencial revocada,
 * y un claim cuyo token no quedó guardado no se lo entrega al celular.
 */

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Marca un pedido para que su cambio de estado se guarde aunque responda con
 * error (por ejemplo, el contador de intentos fallidos del PIN, que responde 401).
 */
export const keepStateOnError = (res: Response): void => {
  res.locals.keepStateOnError = true;
};

// Se leen en cada uso (y no al importar) para respetar el .env que carga index.ts.
const redisUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const stateKey = () => process.env.STATE_KEY || 'baprotege:state:v1';
/** Versión del estado en Redis: sube en cada escritura. Sin la clave, vale "0". */
const versionKey = () => `${stateKey()}:version`;

const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN;
const blobPath = () => `${stateKey().replace(/:/g, '/')}.json`;

const useRedis = () => Boolean(redisUrl() && redisToken());

export const isPersistenceEnabled = (): boolean =>
  process.env.NODE_ENV !== 'test' && (useRedis() || Boolean(blobToken()));

/** Otra instancia guardó el estado después de que este pedido lo leyera. */
export class StateConflictError extends Error {
  constructor() {
    super('El estado cambió mientras se atendía el pedido');
    this.name = 'StateConflictError';
  }
}

/**
 * Versión leída por el pedido en curso: la versión de Redis o el ETag del blob
 * (null si todavía no había estado guardado). Alcanza con una sola variable
 * porque el candado de abajo atiende los pedidos de a uno por instancia.
 */
let loadedVersion: string | null = null;

/**
 * Guarda solo si la versión sigue siendo la esperada, y la incrementa. Devuelve
 * 1 si guardó y 0 si otra instancia escribió antes (conflicto).
 */
const CONDITIONAL_SET_SCRIPT = `
local current = redis.call('GET', KEYS[2])
if (current or '0') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('INCR', KEYS[2])
return 1
`;

async function readRaw(): Promise<{ raw: string | null; version: string | null }> {
  if (useRedis()) {
    // MGET lee el estado y su versión de forma atómica.
    const result = await redis(['MGET', stateKey(), versionKey()]);
    const [raw, version] = Array.isArray(result) ? result : [null, null];
    return {
      raw: typeof raw === 'string' ? raw : null,
      version: typeof version === 'string' ? version : '0'
    };
  }
  try {
    // useCache: false lee siempre la última versión (con caché, otra instancia veía datos viejos).
    const blob = await get(blobPath(), { access: 'private', token: blobToken(), useCache: false });
    if (!blob || !blob.stream) return { raw: null, version: null };
    return { raw: await new Response(blob.stream).text(), version: blob.blob.etag ?? null };
  } catch (error) {
    // Primer arranque: todavía no se guardó ningún estado.
    if (error instanceof Error && /not.?found/i.test(error.name + error.message)) {
      return { raw: null, version: null };
    }
    throw error;
  }
}

async function writeRaw(value: string, expectedVersion: string | null): Promise<void> {
  if (useRedis()) {
    const saved = await redis([
      'EVAL',
      CONDITIONAL_SET_SCRIPT,
      2,
      stateKey(),
      versionKey(),
      expectedVersion ?? '0',
      value
    ]);
    if (Number(saved) !== 1) throw new StateConflictError();
    return;
  }
  try {
    await put(blobPath(), value, {
      access: 'private',
      // Sin ETag (no había estado guardado) solo se crea: si otra instancia ya
      // lo creó, falla en lugar de pisarlo.
      allowOverwrite: expectedVersion !== null,
      ...(expectedVersion !== null ? { ifMatch: expectedVersion } : {}),
      addRandomSuffix: false,
      contentType: 'application/json',
      token: blobToken()
    });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw new StateConflictError();
    throw error;
  }
}

type Snapshot = {
  responsables: typeof db.responsables;
  devices: typeof db.devices;
  events: typeof db.events;
  alerts: typeof db.alerts;
  blocklistSyncLog: typeof db.blocklistSyncLog;
  siteSuggestions: typeof db.siteSuggestions;
  claimThrottle: typeof db.claimThrottle;
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
    siteSuggestions: db.siteSuggestions,
    claimThrottle: db.claimThrottle,
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
  // Los estados guardados antes de estas funciones no traen los campos.
  db.siteSuggestions = snapshot.siteSuggestions ?? [];
  db.claimThrottle = snapshot.claimThrottle ?? {};
  const stored = snapshot.blocklist ?? [];
  db.blocklist = db.blocklistSyncLog.length > 0 ? stored : [...officialFromSource, ...stored];
}

export async function loadState(): Promise<void> {
  if (!isPersistenceEnabled()) return;
  const { raw, version } = await readRaw();
  loadedVersion = version;
  if (raw) {
    applySnapshot(JSON.parse(raw) as Snapshot);
  }
}

/**
 * Guarda el estado si nadie más escribió desde el último loadState.
 * Si hubo otra escritura en el medio, lanza StateConflictError.
 */
export async function saveState(): Promise<void> {
  if (!isPersistenceEnabled()) return;
  await writeRaw(JSON.stringify(toSnapshot()), loadedVersion);
}

const SAVE_FAILED_ERROR = 'No pudimos guardar el cambio. Intentá de nuevo en unos segundos.';

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
    if (
      !MUTATING.has(req.method) ||
      (res.statusCode >= 400 && res.locals.keepStateOnError !== true)
    ) {
      done();
    } else {
      saveState().then(done, error => {
        if (error instanceof StateConflictError) {
          console.warn('[persistence] otra instancia guardó antes: se descarta este cambio');
        } else {
          console.error('[persistence] no se pudo guardar el estado', error);
        }
        // El cambio no quedó guardado: no se responde como si hubiera salido bien
        // (por ejemplo, una credencial de celular cuyo hash no se guardó).
        if (res.headersSent) {
          done();
          return;
        }
        const body = JSON.stringify({ error: SAVE_FAILED_ERROR });
        res.statusCode = 503;
        res.removeHeader('ETag');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        originalEnd(body);
        releaseOnce();
      });
    }
    return res;
  };

  next();
};
