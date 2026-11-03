import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../src/components/AppButton";
import AppInput from "../../src/components/AppInput";
import AppAlert from "../../src/components/AppAlert";
import AppSwitch from "../../src/components/AppSwitch";
import ConfirmModal from "../../src/components/ConfirmModal";
import PinInput from "../../src/components/PinInput";
import ScreenState from "../../src/components/ScreenState";
import { useAsyncResource } from "../../src/hooks/useAsyncResource";
import { useSession } from "../../src/services/session";
import { logout, verifySecurityPin } from "../../src/services/auth";
import {
  getDeviceById,
  setDeviceProtection,
  unlinkDevice,
} from "../../src/services/deviceService";
import {
  checkDomain,
  getBlocklist,
  recordDeviceEvent,
} from "../../src/services/blocklistService";
import { errorMessage } from "../../src/services/api";
import { formatDate } from "../../src/utils/date";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";
import LocalVpnModule from "../../modules/local-vpn";

const IS_ANDROID = Platform.OS === "android";

/** Cada cuánto se vuelve a consultar el estado del perfil mientras la app está abierta. */
const REMOTE_STATUS_INTERVAL_MS = 60_000;

type PinAction = "exit" | "pause";

type Feedback = { message: string; variant: "success" | "warning" | "error" | "info" };

/** "https://www.Sitio.com/ruta" -> "www.sitio.com". Devuelve null si no parece un dominio. */
function normalizeDomain(value: string): string | null {
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#]/)[0]
    .split(":")[0]
    .replace(/^\*\./, "")
    .replace(/\.+$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null;
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

/** Registra un evento sin frenar la pantalla si la conexión falla. */
async function recordSafely(event: Parameters<typeof recordDeviceEvent>[0]) {
  try {
    await recordDeviceEvent(event);
  } catch {
    // El evento es informativo para la persona adulta; no bloquea la acción.
  }
}

/** Home del celular protegido. */
export default function ProtectedHomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const deviceId = session?.linkedDeviceId;
  const deviceName = session?.linkedDeviceName;

  const blocklist = useAsyncResource(getBlocklist, []);
  const domains = useMemo(
    () => blocklist.data?.blocklist.map((item) => item.domain) ?? [],
    [blocklist.data],
  );
  const totalSites = blocklist.data
    ? blocklist.data.status.totalOfficial + blocklist.data.status.totalCustom
    : 0;
  const lastUpdated = blocklist.data?.status.lastUpdated
    ? new Date(blocklist.data.status.lastUpdated)
    : null;

  // Estado del perfil en el servidor: la persona adulta puede pausar o reactivar
  // la protección desde su celular, y este celular lo aplica al sincronizar.
  const remoteDevice = useAsyncResource(
    () => (deviceId ? getDeviceById(deviceId) : Promise.resolve(undefined)),
    [deviceId],
  );
  const reloadRemote = remoteDevice.reload;
  const remoteStatus = remoteDevice.data?.status;
  const pausedByAdult = remoteStatus === "disabled";

  const [vpnOn, setVpnOn] = useState(() => (IS_ANDROID ? isRunningSafe() : false));
  const [vpnBusy, setVpnBusy] = useState(false);
  const [vpnFeedback, setVpnFeedback] = useState<Feedback | null>(null);

  const [siteInput, setSiteInput] = useState("");
  const [siteError, setSiteError] = useState("");
  const [checking, setChecking] = useState(false);
  const [siteFeedback, setSiteFeedback] = useState<Feedback | null>(null);

  const [pinAction, setPinAction] = useState<PinAction | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  // El estado de la VPN puede cambiar desde los ajustes de Android: se relee al volver.
  const refreshVpn = useCallback(() => {
    if (IS_ANDROID) setVpnOn(isRunningSafe());
  }, []);

  useFocusEffect(refreshVpn);

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

  // Con la VPN activa, cada lista nueva que llega del servidor se envía al servicio.
  const syncedSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!IS_ANDROID || !blocklist.data || domains.length === 0) return;
    const signature = `${domains.length}:${blocklist.data.status.lastUpdated}:${blocklist.data.status.totalCustom}`;
    if (syncedSignature.current === signature || !isRunningSafe()) return;
    syncedSignature.current = signature;
    LocalVpnModule.startVpn(domains).catch(() => {
      syncedSignature.current = null;
    });
  }, [blocklist.data, domains]);

  if (!deviceId) {
    return <Redirect href="/protected/link" />;
  }
  const linkedDeviceId: string = deviceId;

  async function startProtection() {
    setVpnBusy(true);
    setVpnFeedback(null);
    try {
      const started = await LocalVpnModule.startVpn(domains);
      setVpnOn(started);
      if (started) {
        await syncServerStatus(linkedDeviceId, true);
        await reloadRemote();
        syncedSignature.current = blocklist.data
          ? `${domains.length}:${blocklist.data.status.lastUpdated}:${blocklist.data.status.totalCustom}`
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
      startProtection();
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
      const valid = await verifySecurityPin(pin);
      if (!valid) {
        await recordSafely({
          deviceId: linkedDeviceId,
          eventType: "BYPASS_ATTEMPT",
          details:
            pinAction === "exit"
              ? "PIN incorrecto al intentar salir del modo protegido"
              : "PIN incorrecto al intentar pausar la protección",
        });
        setPin("");
        setPinError(
          "El PIN no es correcto. La persona adulta va a ver este intento en su celular.",
        );
        return;
      }

      if (IS_ANDROID) {
        try {
          LocalVpnModule.stopVpn();
        } catch {
          // Si el servicio ya estaba detenido no hay nada más que hacer.
        }
      }

      if (pinAction === "pause") {
        await syncServerStatus(linkedDeviceId, false);
        await recordSafely({
          deviceId: linkedDeviceId,
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
        deviceId: linkedDeviceId,
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

  async function handleCheckSite() {
    if (checking) return;
    setSiteFeedback(null);
    const domain = normalizeDomain(siteInput);
    if (!domain) {
      setSiteError("Ingresá un sitio válido, por ejemplo sitio.com.ar");
      return;
    }

    setChecking(true);
    try {
      const result = await checkDomain(domain);
      if (result.isBlocked) {
        await recordSafely({
          deviceId: linkedDeviceId,
          eventType: "ACCESS_ATTEMPT",
          domain: result.domain || domain,
          details: "Intento de acceso a un sitio de la lista de bloqueo",
        });
        router.push({
          pathname: "/protected/blocked",
          params: { domain: result.domain || domain },
        });
      } else {
        setSiteFeedback({ message: "Este sitio está permitido.", variant: "success" });
      }
    } catch (err) {
      setSiteFeedback({
        message: errorMessage(err, "No pudimos revisar el sitio. Intentá de nuevo."),
        variant: "error",
      });
    } finally {
      setChecking(false);
    }
  }

  const protectionLabel = IS_ANDROID
    ? vpnOn
      ? "Activa"
      : pausedByAdult
        ? "Pausada por la persona adulta"
        : "Pausada"
    : "Disponible en la app de Android";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="BA Protege+"
          />
        </View>

        {/* Tarjeta principal */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIcon, vpnOn || !IS_ANDROID ? styles.heroIconOn : styles.heroIconOff]}>
            <Ionicons
              name={vpnOn || !IS_ANDROID ? "shield-checkmark" : "shield-outline"}
              size={40}
              color={vpnOn || !IS_ANDROID ? colors.successText : colors.warningText}
            />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {IS_ANDROID && !vpnOn
              ? "La protección está pausada"
              : "Este celular está protegido"}
          </Text>
          {deviceName ? (
            <Text style={styles.heroSubtitle}>Perfil de {deviceName}</Text>
          ) : null}

          <View style={styles.statusRows}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Bloqueo de sitios</Text>
              <View
                style={[
                  styles.badge,
                  IS_ANDROID
                    ? vpnOn
                      ? styles.badgeOn
                      : styles.badgeOff
                    : styles.badgeNeutral,
                ]}
              >
                <Text style={styles.badgeText}>{protectionLabel}</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Sitios en la lista</Text>
              {blocklist.data ? (
                <Text style={styles.statusValue}>{totalSites.toLocaleString("es-AR")}</Text>
              ) : (
                <Text style={styles.statusValue}>{blocklist.loading ? "..." : "-"}</Text>
              )}
            </View>
          </View>

          {lastUpdated && !Number.isNaN(lastUpdated.getTime()) ? (
            <Text style={styles.caption}>
              Listado oficial de LOTBA, actualizado el {formatDate(lastUpdated)}
            </Text>
          ) : null}
        </View>

        <ScreenState
          error={blocklist.error}
          onRetry={blocklist.reload}
        />

        {/* Control de la VPN (Android) o explicación (web) */}
        {IS_ANDROID ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Protección en este celular</Text>
            <Text style={styles.cardText}>
              Bloquea los sitios de apuestas de la lista en todas las apps y navegadores.
              Para pausarla hace falta el PIN de la persona adulta.
            </Text>
            {pausedByAdult && !vpnOn ? (
              <AppAlert
                variant="info"
                message="La persona adulta pausó la protección desde su celular. Si querés, podés volver a activarla acá."
              />
            ) : null}
            {!pausedByAdult && remoteStatus === "active" && !vpnOn && !vpnBusy ? (
              <AppAlert
                variant="warning"
                message="La protección está activa en la cuenta de la persona adulta, pero el bloqueo está apagado en este celular. Activalo con el interruptor."
              />
            ) : null}
            <AppSwitch
              label="Bloqueo de sitios de apuestas"
              accessibilityLabel={
                deviceName ? `Protección de ${deviceName}` : "Bloqueo de sitios de apuestas"
              }
              value={vpnOn}
              onValueChange={handleVpnToggle}
              disabled={vpnBusy || (!vpnOn && !blocklist.data && blocklist.loading)}
            />
            {vpnBusy ? <Text style={styles.caption}>Activando la protección...</Text> : null}
            {vpnFeedback ? (
              <AppAlert message={vpnFeedback.message} variant={vpnFeedback.variant} />
            ) : null}
          </View>
        ) : (
          <AppAlert
            variant="info"
            message="En el navegador no podemos bloquear sitios. El bloqueo lo hace la app de BA Protege+ para Android, instalada en el celular. Acá podés probar si un sitio está en la lista."
          />
        )}

        {/* Probar un sitio */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Probar un sitio</Text>
          <Text style={styles.cardText}>
            Escribí la dirección de un sitio para saber si está en la lista de bloqueo.
          </Text>
          <AppInput
            label="Sitio web"
            placeholder="sitio.com.ar"
            value={siteInput}
            onChangeText={(text) => {
              setSiteInput(text);
              setSiteError("");
              setSiteFeedback(null);
            }}
            keyboardType="url"
            error={siteError}
          />
          <AppButton title="Probar" onPress={handleCheckSite} loading={checking} />
          {siteFeedback ? (
            <AppAlert message={siteFeedback.message} variant={siteFeedback.variant} />
          ) : null}
        </View>

        <View style={styles.exit}>
          <AppButton
            title="Salir del modo protegido"
            variant="tertiary"
            onPress={() => openPinModal("exit")}
          />
        </View>
      </ScrollView>

      <ConfirmModal
        visible={pinAction !== null}
        title={pinAction === "pause" ? "Pausar la protección" : "Salir del modo protegido"}
        message={
          pinAction === "pause"
            ? "Para pausar el bloqueo de sitios, la persona adulta tiene que ingresar su PIN."
            : "Para dejar de proteger este celular, la persona adulta tiene que ingresar su PIN."
        }
        confirmLabel={pinAction === "pause" ? "Pausar" : "Salir"}
        onConfirm={handlePinConfirm}
        onCancel={closePinModal}
        destructive
        busy={pinBusy}
        error={pinError}
      >
        <PinInput
          value={pin}
          onChange={(value) => {
            setPin(value);
            setPinError(null);
          }}
          label="PIN de la persona adulta"
          autoFocus
        />
      </ConfirmModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  logo: {
    width: 125,
    height: 55,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroIconOn: {
    backgroundColor: colors.successSoft,
  },
  heroIconOff: {
    backgroundColor: colors.warningSoft,
  },
  heroTitle: {
    ...typography.title,
    textAlign: "center",
  },
  heroSubtitle: {
    ...typography.body,
    textAlign: "center",
  },
  statusRows: {
    alignSelf: "stretch",
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  statusLabel: {
    ...typography.label,
  },
  statusValue: {
    ...typography.subtitle,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexShrink: 1,
  },
  badgeOn: {
    backgroundColor: colors.successSoft,
  },
  badgeOff: {
    backgroundColor: colors.warningSoft,
  },
  badgeNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  caption: {
    ...typography.caption,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardTitle: {
    ...typography.subtitle,
  },
  cardText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  exit: {
    marginTop: spacing.sm,
  },
});
