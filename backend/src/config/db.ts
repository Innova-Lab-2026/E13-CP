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
  passwordHash: string;
  name: string;
  telefono?: string;
  /** Perfil asociado al usuario. Se deriva de `esResponsable` al registrarse. */
  rol: UserRole;
  /** Modo de uso persistido. Se actualiza mediante PATCH /api/auth/me/mode. */
  mode: UserMode;
  createdAt: string;
}

export interface Device {
  id: string;
  responsibleId: string;
  deviceName: string;
  deviceToken: string;
  status: 'active' | 'inactive';
  lastSeen: string;
  createdAt: string;
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
  eventType: 'ACCESS_ATTEMPT' | 'APP_INSTALL_ATTEMPT' | 'PROTECTION_MODIFIED' | 'BYPASS_ATTEMPT';
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

  constructor() {
    // La lista oficial se siembra desde la fuente versionada.
    this.blocklist = buildOfficialBlocklistItems(CURRENT_OFFICIAL_BLOCKLIST);
  }
}

export const db = new Database();
