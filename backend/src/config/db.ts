import {
  CURRENT_OFFICIAL_BLOCKLIST,
  OfficialBlocklistSnapshot
} from './blocklistSource';

/**
 * Perfil del usuario devuelto por la API.
 *
 * En el alcance del MVP **no hay diferencias de permisos** entre ambos perfiles:
 * los dos son adultos administradores de la protección. La autorización de las
 * operaciones críticas se resuelve con el PIN del adulto responsable
 * (PATCH /api/auth/pin y POST /api/devices/confirm-link).
 *
 * La distinción queda preparada para el escalamiento institucional del Future
 * Scope (dashboard institucional, administración centralizada), donde sí se
 * necesitarán niveles de acceso diferenciados.
 *
 * - `responsable`: adulto a cargo (gestiona dispositivos y recibe alertas).
 * - `tutor`: usuario encargado del accompagnement sobre el dispositivo protegido.
 */
export type UserRole = 'responsable' | 'tutor';

/**
 * Modo de uso de la aplicación, elegido en la pantalla "Selección de Modo".
 * - `adulto`: el usuario opera como responsable y accede a su dashboard.
 * - `dispositivo_protegido`: el usuario opera desde el dispositivo que se protege.
 */
export type UserMode = 'adulto' | 'dispositivo_protegido';

export const USER_ROLES: UserRole[] = ['responsable', 'tutor'];
export const USER_MODES: UserMode[] = ['adulto', 'dispositivo_protegido'];

export interface Responsible {
  id: string;
  email: string;
  /**
   * Hash bcrypt de la contraseña. Falta en las cuentas creadas con
   * "Continuar con Google", que no tienen contraseña propia.
   */
  passwordHash?: string;
  /**
   * Identificador estable de la cuenta de Google vinculada (claim `sub` del
   * id_token). Nunca se expone en las respuestas de la API.
   */
  googleSub?: string;
  name: string;
  telefono?: string;
  /** Perfil asociado al usuario. Se deriva de `esResponsable` al registrarse. */
  rol: UserRole;
  /** Modo de uso persistido. Se actualiza mediante PATCH /api/auth/me/mode. */
  mode: UserMode;
  /**
   * Hash bcrypt del PIN de 4 dígitos con el que el adulto autoriza la
   * vinculación y los cambios críticos. Nunca se almacena en texto plano.
   */
  pinHash?: string;
  /** Fecha en que se configuró el PIN vigente. */
  pinUpdatedAt?: string;
  /** Intentos fallidos seguidos con el PIN (se reinicia al acertar o al bloquear). */
  pinFailedAttempts?: number;
  /** Hasta cuándo el PIN queda bloqueado por demasiados intentos fallidos (ISO). */
  pinLockedUntil?: string;
  /** Token de push notifications del responsable (registrado desde la app móvil). */
  pushToken?: string;
  createdAt: string;
}

/**
 * Estados de un dispositivo protegido.
 * - `pending`: perfil creado, pendiente de confirmar el vínculo con el PIN.
 * - `active`: vínculo confirmado, la protección está operativa.
 * - `inactive`: protección desactivada por el adulto responsable.
 */
export type DeviceStatus = 'pending' | 'active' | 'inactive';

export interface Device {
  id: string;
  responsibleId: string;
  deviceName: string;
  /** Fecha de nacimiento del menor, en formato ISO (AAAA-MM-DD). */
  fechaNacimiento: string;
  /**
   * Código de vinculación de 8 caracteres alfanuméricos.
   * Con él (y el PIN del adulto) el celular del menor se vincula sin que el
   * adulto tenga que iniciar sesión ahí: POST /api/devices/claim.
   */
  linkCode: string;
  /** Hasta cuándo sirve el código (ISO). Sin fecha, el código se considera vencido. */
  linkCodeExpiresAt?: string;
  /** Cuándo se usó o se invalidó el código (ISO). Un código usado no sirve más. */
  linkCodeUsedAt?: string;
  /** PIN incorrectos seguidos con el código vigente: a los 5 el código se invalida. */
  linkFailedAttempts?: number;
  /** Cuándo quedó vinculado el celular (ISO). Se borra al desvincularlo. */
  linkedAt?: string;
  /**
   * SHA-256 (hex) de la credencial opaca del celular vinculado por código.
   * El secreto en sí solo se entrega una vez, en la respuesta del claim.
   */
  deviceSecretHash?: string;
  /** Cuándo se emitió la credencial vigente (ISO). */
  deviceSecretIssuedAt?: string;
  /**
   * Cuándo el adulto (o el propio celular) lo desvinculó por última vez (ISO).
   * Mientras siga pendiente con ese código, PATCH /:id/status no lo reactiva.
   */
  unlinkedAt?: string;
  /** Identificador del dispositivo para las notificaciones push (FCM). */
  deviceToken?: string;
  status: DeviceStatus;
  lastSeen: string;
  createdAt: string;
}

/**
 * Forma pública de un dispositivo: lo que devuelven las respuestas de la API.
 * Nunca incluye la credencial, el contador de intentos ni el deviceToken.
 */
export interface PublicDevice {
  id: string;
  responsibleId: string;
  deviceName: string;
  fechaNacimiento: string;
  status: DeviceStatus;
  lastSeen: string;
  createdAt: string;
  linkedAt?: string;
  /** Solo si el dispositivo está pendiente y el código sigue vigente. */
  linkCode?: string;
  linkCodeExpiresAt?: string;
}

/** Motivos válidos de una sugerencia de sitio (pantalla "Sugerir un sitio"). */
export const SUGGESTION_REASONS = [
  'apuestas_ilegales',
  'publicidad_apuestas',
  'contenido_inapropiado',
  'otro'
] as const;

export type SuggestionReason = typeof SUGGESTION_REASONS[number];

/** Sitio que un adulto sugiere sumar a la lista; el equipo lo revisa con LOTBA. */
export interface SiteSuggestion {
  id: string;
  responsibleId: string;
  domain: string;
  motivo: SuggestionReason;
  info?: string;
  createdAt: string;
  status: 'pendiente';
}

/** Intentos fallidos de vinculación por código desde una misma IP (hash SHA-256). */
export interface ClaimThrottleEntry {
  count: number;
  /** Inicio de la ventana de 15 minutos (ISO). */
  firstAt: string;
}

export interface BlocklistItem {
  id: string;
  domain: string;
  type: 'LOTBA_OFFICIAL' | 'CUSTOM';
  addedBy?: string; // responsibleId if CUSTOM, null/undefined if LOTBA_OFFICIAL
  /** Categoría funcional del bloqueo. Ej.: "Apuestas", "Personalizado". */
  categoria: string;
  /** Período del listado oficial al que pertenece el dominio (solo LOTBA_OFFICIAL). */
  period?: string;
  /** Última vez que se actualizó la lista que contiene el dominio. */
  updatedAt: string;
  createdAt: string;
}

/** Registro de auditoría de cada sincronización de la lista oficial de LOTBA. */
export interface BlocklistSyncLog {
  id: string;
  /** Período del listado cargado. */
  version: string;
  /** Origen declarado del listado. */
  source: string;
  /** Fecha de la sincronización. */
  updatedAt: string;
  /** Cantidad de dominios oficiales vigentes luego de la sincronización. */
  totalOfficial: number;
  /** Dominios que se agregaron respecto de la lista anterior. */
  added: string[];
  /** Dominios que se quitaron respecto de la lista anterior. */
  removed: string[];
  /** Identificador de quien ejecutó la sincronización. */
  requestedBy: string;
}

/** Estado de actualización de la lista de bloqueo, para mostrarlo en la app. */
export interface BlocklistStatus {
  /** Período del listado oficial vigente. */
  version: string;
  /** Origen del listado oficial. */
  source: string;
  /** Fecha de la última sincronización efectiva. */
  lastUpdated: string;
  /** Cantidad de dominios oficiales vigentes. */
  totalOfficial: number;
  /** Cantidad de dominios personalizados del responsable autenticado. */
  totalCustom: number;
}

export interface EventItem {
  id: string;
  deviceId: string;
  eventType:
    | 'SITE_BLOCKED'
    | 'UNINSTALL_ATTEMPT'
    | 'APP_INSTALL_ATTEMPT'
    | 'BYPASS_ATTEMPT'
    | 'ACCESS_ATTEMPT'
    | 'PROTECTION_MODIFIED';
  domain?: string;
  details: string;
  timestamp: string;
}

export interface AlertItem {
  id: string;
  responsibleId: string;
  deviceId: string;
  alertType: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/**
 * Construye los ítems oficiales a partir de un snapshot del listado de LOTBA.
 * La lista oficial nunca se mezcla con los dominios personalizados del usuario.
 */
export const buildOfficialBlocklistItems = (
  snapshot: OfficialBlocklistSnapshot
): BlocklistItem[] =>
  snapshot.domains.map((entry, index) => ({
    id: `lotba-${index + 1}`,
    domain: entry.domain.toLowerCase().trim(),
    type: 'LOTBA_OFFICIAL',
    categoria: entry.categoria,
    period: snapshot.version,
    updatedAt: snapshot.updatedAt,
    createdAt: snapshot.updatedAt
  }));

class Database {
  public responsables: Responsible[] = [];
  public devices: Device[] = [];

  /**
   * Lista de bloqueo vigente. Los ítems oficiales provienen de la fuente LOTBA
   * (`config/blocklistSource`) y los personalizados son agregados por cada
   * adulto responsable.
   */
  public blocklist: BlocklistItem[] = [];

  /** Historial de sincronizaciones de la lista oficial de LOTBA. */
  public blocklistSyncLog: BlocklistSyncLog[] = [];

  public events: EventItem[] = [];
  public alerts: AlertItem[] = [];

  /** Sugerencias de sitios enviadas desde la app, pendientes de revisar con LOTBA. */
  public siteSuggestions: SiteSuggestion[] = [];

  /**
   * Intentos fallidos de POST /api/devices/claim por IP. La clave es el hash
   * SHA-256 de la IP: la dirección en sí no se guarda.
   */
  public claimThrottle: Record<string, ClaimThrottleEntry> = {};

  constructor() {
    // La lista oficial se siembra desde la fuente versionada.
    this.blocklist = buildOfficialBlocklistItems(CURRENT_OFFICIAL_BLOCKLIST);
  }
}

export const db = new Database();
