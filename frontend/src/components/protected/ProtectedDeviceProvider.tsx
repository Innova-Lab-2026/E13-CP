import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { Redirect, useRouter } from "expo-router";
import ConfirmModal from "../ConfirmModal";
import PinInput from "../PinInput";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { useSession } from "../../services/session";
import { clearDeviceSession, useDeviceSession } from "../../services/deviceSession";
import { logout, verifySecurityPin } from "../../services/auth";
import { getDeviceById, setDeviceProtection, unlinkDevice } from "../../services/deviceService";
import {
  getMyBlocklist,
  getMyDevice,
  recordMyEvent,
  setMyProtection,
  unlinkMe,
} from "../../services/myDeviceService";
import {
  getBlocklist,
  recordDeviceEvent,
  type BlocklistItem,
  type BlocklistStatus,
  type SecurityEventType,
} from "../../services/blocklistService";
import { ApiError, errorMessage } from "../../services/api";
import LocalVpnModule from "../../../modules/local-vpn";

export const IS_ANDROID = Platform.OS === "android";

/** Cada cuánto se vuelve a consultar el estado del perfil mientras la app está abierta. */
const REMOTE_STATUS_INTERVAL_MS = 60_000;

/**
 * Acciones que piden el PIN de la persona adulta. "resume" solo existe en el
 * celular vinculado con un código: reactivar una protección pausada también lo pide.
 */
type PinAction = "exit" | "pause" | "resume";

export type Feedback = { message: string; variant: "success" | "warning" | "error" | "info" };

export type DeviceEvent = { eventType: SecurityEventType; domain?: string; details: string };

const PIN_MODAL_TEXT: Record<PinAction, { title: string; message: string; confirm: string }> = {
  pause: {
    title: "Pausar la protección",
    message: "Para pausar el bloqueo de sitios, la persona adulta tiene que ingresar su PIN.",
    confirm: "Pausar",
  },
  exit: {
    title: "Salir del modo protegido",
    message:
      "Para dejar de proteger este celular, la persona adulta tiene que ingresar su PIN.",
    confirm: "Salir",
  },
  resume: {
    title: "Volver a activar la protección",
    message:
      "La protección está pausada desde la cuenta de la persona adulta. Para activarla de nuevo en este celular, tiene que ingresar su PIN.",
    confirm: "Activar",
  },
};

type BlocklistData = { blocklist: BlocklistItem[]; status: BlocklistStatus };

export type ProtectedDeviceState = {
  /** Vinculado con un código (credencial propia del celular, rutas /me). */
  isDevice: boolean;
  deviceId: string;
  deviceName?: string;
  blocklist: {
    data: BlocklistData | undefined;
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
  };
  totalSites: number;
  /** Estado del perfil en el servidor ("active", "disabled"...). */
  remoteStatus?: string;
  /** La persona adulta pausó la protección desde su celular. */
  pausedByAdult: boolean;
  reloadRemote: () => Promise<void>;
  /** Bloqueo real en Android (VPN local). En la web siempre es false. */
  vpnOn: boolean;
  vpnBusy: boolean;
  vpnFeedback: Feedback | null;
  /** Lo que pasa al tocar el interruptor: activar, o pedir el PIN para pausar/reactivar. */
  handleVpnToggle: (next: boolean) => void;
  /** Relee el estado de la VPN (puede cambiar desde los ajustes de Android). */
  refreshVpn: () => void;
  /** Registra un evento para la persona adulta sin frenar la pantalla si falla. */
  recordSafely: (event: DeviceEvent) => Promise<void>;
  /** Abre el pedido de PIN para salir del modo protegido. */
  requestExit: () => void;
};

const ProtectedDeviceContext = createContext<ProtectedDeviceState | null>(null);

/** Estado del celular protegido para las pantallas de las pestañas. */
export function useProtectedDevice(): ProtectedDeviceState {
  const value = useContext(ProtectedDeviceContext);
  if (!value) {
    throw new Error("useProtectedDevice se usa dentro de ProtectedDeviceProvider.");
  }
  return value;
}

function isRunningSafe(): boolean {
  try {
    return LocalVpnModule.isVpnRunning();
  } catch {
    return false;
  }
}

/** Refleja el estado de la protección en el servidor sin frenar la pantalla si falla. */
async function syncServerStatus(deviceId: string, active: boolean) {
  try {
    await setDeviceProtection(deviceId, active);
  } catch {
    // Se vuelve a intentar la próxima vez que cambie la protección.
  }
}

function blocklistSignature(data: BlocklistData, domainCount: number): string {
  return `${domainCount}:${data.status.lastUpdated}:${data.status.totalCustom}`;
}

/**
 * Estado compartido del celular protegido (lista de bloqueo, estado del perfil,
 * VPN de Android y pedidos de PIN). Vive en el layout de las pestañas para que la
 * sincronización con el servidor siga corriendo en cualquier pestaña.
 *
 * Funciona de dos formas:
 * - Vinculado con un código: usa la credencial propia del celular (rutas /me).
 * - Vinculado iniciando sesión con la cuenta de la persona adulta (forma anterior).
 */
export default function ProtectedDeviceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session } = useSession();
  const { deviceSession } = useDeviceSession();
  const isDevice = !!deviceSession;
  const deviceId = deviceSession?.deviceId ?? session?.linkedDeviceId;
  const deviceName = deviceSession?.deviceName ?? session?.linkedDeviceName;

  const blocklist = useAsyncResource(
    () => (isDevice ? getMyBlocklist() : getBlocklist()),
    [isDevice],
  );
  const domains = useMemo(
    () => blocklist.data?.blocklist.map((item) => item.domain) ?? [],
    [blocklist.data],
  );
  const totalSites = blocklist.data
    ? blocklist.data.status.totalOfficial + blocklist.data.status.totalCustom
    : 0;

  // Estado del perfil en el servidor: la persona adulta puede pausar o reactivar
  // la protección desde su celular, y este celular lo aplica al sincronizar.
  // Con la credencial del celular, esta consulta también avisa que sigue conectado;
  // si la persona adulta lo desvinculó, la respuesta lleva a "Este celular fue desvinculado".
  const remoteDevice = useAsyncResource(
    () =>
      isDevice
        ? getMyDevice()
        : deviceId
          ? getDeviceById(deviceId)
          : Promise.resolve(undefined),
    [isDevice, deviceId],
  );
  const reloadRemote = remoteDevice.reload;
  const remoteStatus = remoteDevice.data?.status;
  const pausedByAdult = remoteStatus === "disabled";
  // Vinculado de la forma anterior y la persona adulta lo desvinculó desde su
  // celular: no se reactiva el perfil (eso gastaría el código nuevo); se vuelve
  // a la vinculación con su PIN.
  const unlinkedByAdult = !isDevice && remoteStatus === "pending";

  const [vpnOn, setVpnOn] = useState(() => (IS_ANDROID ? isRunningSafe() : false));
  const [vpnBusy, setVpnBusy] = useState(false);
  const [vpnFeedback, setVpnFeedback] = useState<Feedback | null>(null);

  const [pinAction, setPinAction] = useState<PinAction | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  // El estado de la VPN puede cambiar desde los ajustes de Android: se relee al volver.
  const refreshVpn = useCallback(() => {
    if (IS_ANDROID) setVpnOn(isRunningSafe());
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshVpn();
        reloadRemote();
      }
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") reloadRemote();
    }, REMOTE_STATUS_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [refreshVpn, reloadRemote]);

  // Si la persona adulta pausó la protección desde su celular, se detiene el bloqueo acá.
  const vpnBusyRef = useRef(false);
  vpnBusyRef.current = vpnBusy;
  useEffect(() => {
    if (!IS_ANDROID || remoteStatus !== "disabled" || vpnBusyRef.current) return;
    if (!isRunningSafe()) return;
    try {
      LocalVpnModule.stopVpn();
    } catch {
      // Si el servicio ya estaba detenido no hay nada más que hacer.
    }
    setVpnOn(false);
    setVpnFeedback({
      message: "La persona adulta pausó la protección desde su celular.",
      variant: "info",
    });
  }, [remoteStatus]);

  useEffect(() => {
    if (!IS_ANDROID || !unlinkedByAdult || !isRunningSafe()) return;
    try {
      LocalVpnModule.stopVpn();
    } catch {
      // Si el servicio ya estaba detenido no hay nada más que hacer.
    }
    setVpnOn(false);
  }, [unlinkedByAdult]);

  // Con la VPN activa, cada lista nueva que llega del servidor se envía al servicio.
  const syncedSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!IS_ANDROID || !blocklist.data || domains.length === 0) return;
    const signature = blocklistSignature(blocklist.data, domains.length);
    if (syncedSignature.current === signature || !isRunningSafe()) return;
    syncedSignature.current = signature;
    LocalVpnModule.startVpn(domains).catch(() => {
      syncedSignature.current = null;
    });
  }, [blocklist.data, domains]);

  if (!deviceId || unlinkedByAdult) {
    return <Redirect href="/protected/link" />;
  }
  const linkedDeviceId: string = deviceId;

  /** Registra un evento sin frenar la pantalla si la conexión falla. */
  async function recordSafely(event: DeviceEvent) {
    try {
      if (isDevice) {
        await recordMyEvent(event);
      } else {
        await recordDeviceEvent({ deviceId: linkedDeviceId, ...event });
      }
    } catch {
      // El evento es informativo para la persona adulta; no bloquea la acción.
    }
  }

  function stopVpnSafely() {
    if (!IS_ANDROID) return;
    try {
      LocalVpnModule.stopVpn();
    } catch {
      // Si el servicio ya estaba detenido no hay nada más que hacer.
    }
  }

  async function startProtection() {
    setVpnBusy(true);
    setVpnFeedback(null);
    try {
      const started = await LocalVpnModule.startVpn(domains);
      setVpnOn(started);
      if (started) {
        // El celular vinculado con un código no cambia el estado del perfil sin el
        // PIN: si estaba pausado, ya se reactivó con el PIN antes de llegar acá.
        if (!isDevice) await syncServerStatus(linkedDeviceId, true);
        await reloadRemote();
        syncedSignature.current = blocklist.data
          ? blocklistSignature(blocklist.data, domains.length)
          : null;
        setVpnFeedback({ message: "La protección está activa en este celular.", variant: "success" });
      } else {
        setVpnFeedback({
          message: "Para proteger este celular, aceptá el permiso de VPN que pide Android.",
          variant: "warning",
        });
      }
    } catch (err) {
      setVpnOn(isRunningSafe());
      setVpnFeedback({
        message: errorMessage(err, "No pudimos activar la protección. Intentá de nuevo."),
        variant: "error",
      });
    } finally {
      setVpnBusy(false);
    }
  }

  function handleVpnToggle(next: boolean) {
    if (vpnBusy) return;
    if (next) {
      if (isDevice && pausedByAdult) {
        openPinModal("resume");
      } else {
        startProtection();
      }
    } else {
      openPinModal("pause");
    }
  }

  function openPinModal(action: PinAction) {
    setPin("");
    setPinError(null);
    setPinAction(action);
  }

  function closePinModal() {
    if (pinBusy) return;
    setPinAction(null);
    setPin("");
    setPinError(null);
  }

  async function handlePinConfirm() {
    if (!pinAction || pinBusy) return;
    if (pin.length !== 4) {
      setPinError("Ingresá los 4 dígitos del PIN.");
      return;
    }

    setPinBusy(true);
    setPinError(null);
    try {
      if (isDevice) {
        await confirmWithDeviceCredential(pinAction);
        return;
      }

      const valid = await verifySecurityPin(pin);
      if (!valid) {
        await handleWrongPin(pinAction);
        return;
      }

      stopVpnSafely();

      if (pinAction === "pause") {
        await syncServerStatus(linkedDeviceId, false);
        await recordSafely({
          eventType: "PROTECTION_MODIFIED",
          details: "Se pausó la protección en este celular",
        });
        await reloadRemote();
        setVpnOn(false);
        setPinAction(null);
        setPin("");
        setVpnFeedback({
          message: "La protección quedó pausada. Podés volver a activarla cuando quieras.",
          variant: "info",
        });
        return;
      }

      await recordSafely({
        eventType: "PROTECTION_MODIFIED",
        details: "Se desactivó el modo protegido en este celular",
      });
      // El perfil vuelve a quedar pendiente para poder vincularlo de nuevo.
      try {
        await unlinkDevice(linkedDeviceId);
      } catch {
        // Si falla, la persona adulta todavía puede revincular el perfil con su PIN.
      }
      setPinAction(null);
      await logout();
      router.replace("/login");
    } catch (err) {
      setPinError(errorMessage(err, "No pudimos verificar el PIN. Intentá de nuevo."));
    } finally {
      setPinBusy(false);
    }
  }

  /** PIN incorrecto: queda registrado para la persona adulta si se intentaba desproteger. */
  async function handleWrongPin(action: PinAction) {
    if (action !== "resume") {
      await recordSafely({
        eventType: "BYPASS_ATTEMPT",
        details:
          action === "exit"
            ? "PIN incorrecto al intentar salir del modo protegido"
            : "PIN incorrecto al intentar pausar la protección",
      });
    }
    setPin("");
    setPinError(
      action === "resume"
        ? "El PIN no es correcto. Revisalo con la persona adulta."
        : "El PIN no es correcto. La persona adulta va a ver este intento en su celular.",
    );
  }

  /**
   * Celular vinculado con un código: el servidor valida el PIN en la misma acción
   * (pausar, reactivar o desvincular) y registra el cambio para la persona adulta.
   */
  async function confirmWithDeviceCredential(action: PinAction) {
    try {
      if (action === "exit") {
        await unlinkMe(pin);
      } else {
        await setMyProtection(action === "resume", pin);
      }
    } catch (err) {
      // Un 401 acá es un PIN incorrecto; si el celular ya no está vinculado, la
      // sesión se cerró y las guardias llevan al aviso de desvinculado.
      if (err instanceof ApiError && err.status === 401) {
        await handleWrongPin(action);
        return;
      }
      throw err;
    }

    setPinAction(null);
    setPin("");

    if (action === "exit") {
      stopVpnSafely();
      await clearDeviceSession("exit");
      router.replace("/");
      return;
    }

    await reloadRemote();
    if (action === "resume") {
      await startProtection();
      return;
    }

    stopVpnSafely();
    setVpnOn(false);
    setVpnFeedback({
      message: "La protección quedó pausada. Podés volver a activarla cuando quieras.",
      variant: "info",
    });
  }

  const value: ProtectedDeviceState = {
    isDevice,
    deviceId: linkedDeviceId,
    deviceName,
    blocklist: {
      data: blocklist.data,
      loading: blocklist.loading,
      error: blocklist.error,
      reload: blocklist.reload,
    },
    totalSites,
    remoteStatus,
    pausedByAdult,
    reloadRemote,
    vpnOn,
    vpnBusy,
    vpnFeedback,
    handleVpnToggle,
    refreshVpn,
    recordSafely,
    requestExit: () => openPinModal("exit"),
  };

  const modalText = PIN_MODAL_TEXT[pinAction ?? "exit"];

  return (
    <ProtectedDeviceContext.Provider value={value}>
      {children}
      <ConfirmModal
        visible={pinAction !== null}
        title={modalText.title}
        message={modalText.message}
        confirmLabel={modalText.confirm}
        onConfirm={handlePinConfirm}
        onCancel={closePinModal}
        destructive={pinAction !== "resume"}
        busy={pinBusy}
        error={pinError}
      >
        <PinInput
          value={pin}
          onChange={(next) => {
            setPin(next);
            setPinError(null);
          }}
          label="PIN de la persona adulta"
          autoFocus
        />
      </ConfirmModal>
    </ProtectedDeviceContext.Provider>
  );
}
