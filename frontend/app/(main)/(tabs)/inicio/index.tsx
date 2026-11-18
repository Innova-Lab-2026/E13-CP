// Inicio del adulto responsable (Figma "Dashboard Responsable").
import { useMemo } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../../../../src/components/ThemedText";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import DeviceItem from "../../../../src/components/DeviceItem";
import AddDeviceButton from "../../../../src/components/AddDeviceButton";
import GreetingHeader from "../../../../src/components/GreetingHeader";
import ScreenState from "../../../../src/components/ScreenState";
import HistoryCard from "../../../../src/components/historial/HistoryCard";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { useSession } from "../../../../src/services/session";
import { getDevices } from "../../../../src/services/deviceService";
import { getAlerts, type Alert } from "../../../../src/services/alertService";
import { getHistoryEvents, type HistoryEvent } from "../../../../src/services/historyService";
import { statusSummary } from "../../../../src/utils/dispositivos";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

const HISTORY_PREVIEW = 3;

/** Círculos de los íconos sobre las tarjetas de color (tonos del Figma). */
const SUCCESS_ICON_BG = colors.successStrongSoft;
const WARNING_ICON_BG = "rgba(233, 148, 12, 0.18)";
const DANGER_ICON_BG = colors.dangerStrongSoft;

/**
 * El backend guarda el evento y su alerta por separado, con ids distintos: es el
 * mismo si coinciden el perfil, el tipo y el momento (con unos segundos de margen).
 */
function isSameEvent(event: HistoryEvent, alert: Alert): boolean {
  if (event.deviceId !== alert.deviceId || event.eventType !== alert.alertType) return false;
  const gap = Math.abs(Date.parse(event.timestamp) - Date.parse(alert.createdAt));
  return Number.isFinite(gap) && gap < 5_000;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useSession();
  const firstName = session?.profile.name?.trim().split(/\s+/)[0] || "";

  const devices = useAsyncResource(() => getDevices(), []);
  const alerts = useAsyncResource(() => getAlerts(), []);
  // Uno de más por si el primero es la alerta que ya muestra la tarjeta de atención.
  const history = useAsyncResource(
    async () => (await getHistoryEvents()).slice(0, HISTORY_PREVIEW + 1),
    [],
  );

  const deviceList = devices.data ?? [];
  const unreadCount = (alerts.data ?? []).filter((alert) => !alert.read).length;

  // La alerta sin leer más reciente que pide intervención (desinstalación o
  // evasión). Las alertas vienen ordenadas de la más nueva a la más vieja.
  const attentionAlert = useMemo<Alert | undefined>(
    () => (alerts.data ?? []).find((alert) => !alert.read && alert.type === "danger"),
    [alerts.data],
  );

  const refreshing =
    (devices.loading && devices.data !== undefined) ||
    (alerts.loading && alerts.data !== undefined) ||
    (history.loading && history.data !== undefined);

  const reloadAll = () => {
    devices.reload();
    alerts.reload();
    history.reload();
  };

  const goToAddDevice = () => router.push("/(main)/(tabs)/dispositivos/add-device");
  const goToDevices = () => router.push("/(main)/(tabs)/dispositivos");

  const renderStatusCard = () => {
    const summary = statusSummary(deviceList);
    const tone = {
      success: {
        card: colors.successSoft,
        circle: SUCCESS_ICON_BG,
        icon: colors.success,
        name: "shield-checkmark-outline" as const,
      },
      warning: {
        card: colors.warningSoft,
        circle: WARNING_ICON_BG,
        icon: colors.warningText,
        name: "shield-outline" as const,
      },
      danger: {
        card: colors.dangerSoft,
        circle: DANGER_ICON_BG,
        icon: colors.dangerText,
        name: "shield-outline" as const,
      },
    }[summary.tone];

    return (
      <Pressable
        style={({ pressed }) => [
          styles.statusCard,
          { backgroundColor: tone.card },
          pressed && styles.pressed,
        ]}
        onPress={goToDevices}
        accessibilityRole="button"
        accessibilityLabel={`${summary.title}. ${summary.subtitle}. Ver dispositivos`}
      >
        <View style={[styles.statusIcon, { backgroundColor: tone.circle }]}>
          <Ionicons name={tone.name} size={26} color={tone.icon} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.statusTitle}>{summary.title}</Text>
          <Text style={styles.statusSubtitle}>{summary.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    );
  };

  const renderSectionHeader = (title: string, onPress: () => void, a11y: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <Pressable
        onPress={onPress}
        style={styles.seeAll}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        hitSlop={8}
      >
        <Text style={styles.linkText}>Ver todo</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text} />
      </Pressable>
    </View>
  );

  const renderDevices = () => {
    if (devices.loading && devices.data === undefined) {
      return <ScreenState loading />;
    }
    if (devices.error && devices.data === undefined) {
      return <ScreenState error={devices.error} onRetry={devices.reload} />;
    }
    if (deviceList.length === 0) {
      return (
        <View style={styles.emptyDevices}>
          <View style={styles.emptyIcon}>
            <Ionicons name="phone-portrait-outline" size={26} color={colors.text} />
          </View>
          <Text style={styles.emptyTitle}>Agregá el primer dispositivo</Text>
          <Text style={styles.emptyText}>
            Sumá el celular de tu hijo o hija para bloquear los sitios de apuestas del
            listado oficial de LOTBA.
          </Text>
          <AddDeviceButton onPress={goToAddDevice} />
        </View>
      );
    }

    return (
      <>
        {renderStatusCard()}

        {renderSectionHeader("Mis Dispositivos", goToDevices, "Ver todos los dispositivos")}

        {deviceList.map((device) => (
          <DeviceItem
            key={device.id}
            deviceId={device.id}
            name={device.name}
            status={device.status}
            onPress={() =>
              router.push({
                pathname: "/(main)/(tabs)/dispositivos/[deviceId]",
                params: { deviceId: device.id },
              })
            }
          />
        ))}

        <AddDeviceButton onPress={goToAddDevice} />
      </>
    );
  };

  const renderAttention = () => {
    if (!attentionAlert) return null;
    // "Sofía intentó desinstalar la aplicación" (subtítulo armado por alertService).
    const message =
      attentionAlert.subtitle ||
      attentionAlert.description.replace(/^¡Alerta de seguridad!\s*/, "");
    const when =
      attentionAlert.date === "Hoy"
        ? attentionAlert.time
        : `${attentionAlert.date} - ${attentionAlert.time}`;

    return (
      <Pressable
        style={({ pressed }) => [styles.attentionCard, pressed && styles.pressed]}
        onPress={() =>
          router.push({
            pathname: "/(main)/(tabs)/inicio/[alertId]",
            params: { alertId: attentionAlert.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`${attentionAlert.title}. ${message}. ${when}. Ver detalle`}
      >
        <View style={styles.attentionIcon}>
          <MaterialCommunityIcons name="alert-octagon-outline" size={28} color={colors.danger} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.attentionTitle}>{attentionAlert.title}</Text>
          <Text style={styles.attentionSubtitle} numberOfLines={2}>
            {message}
          </Text>
          <Text style={styles.attentionTime}>{when}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    );
  };

  const renderHistory = () => {
    const events = (history.data ?? [])
      .filter((event) => !attentionAlert || !isSameEvent(event, attentionAlert))
      .slice(0, HISTORY_PREVIEW);

    return (
      <View style={styles.section}>
        {renderSectionHeader(
          "Historial",
          () => router.push("/(main)/(tabs)/historial"),
          "Ver todo el historial",
        )}

        {history.loading && history.data === undefined ? (
          <ScreenState loading />
        ) : history.error && history.data === undefined ? (
          <ScreenState error={history.error} onRetry={history.reload} />
        ) : events.length === 0 ? (
          <ScreenState
            isEmpty
            emptyTitle="Sin actividad por ahora"
            emptyText="Cuando haya bloqueos o cambios en la protección, los vas a ver acá."
          />
        ) : (
          events.map((event) => (
            <HistoryCard
              key={event.id}
              variant={event.variant}
              title={event.title}
              // Figma: "Ramiro - apostando-sitio.com". El sitio solo, sin repetirlo entre paréntesis.
              description={event.domain || event.description}
              time={event.date === "Hoy" ? event.time : `${event.date} - ${event.time}`}
              device={event.device}
              onPress={() =>
                router.push({
                  pathname: "/(main)/(tabs)/historial/[historyId]",
                  params: { historyId: event.id },
                })
              }
            />
          ))
        )}
      </View>
    );
  };

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reloadAll} tintColor={colors.text} />
        }
      >
        <View style={styles.topBar}>
          <Image
            source={require("../../../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BA Protege+"
          />
          <Pressable
            style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
            onPress={() => router.push("/(main)/(tabs)/inicio/alerts")}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Alertas, ${unreadCount} sin leer`
                : "Alertas"
            }
            hitSlop={6}
          >
            <Ionicons name="notifications-outline" size={28} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{badge}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <GreetingHeader name={firstName} />

        {renderDevices()}
        {renderAttention()}
        {renderHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 110,
    height: 36,
  },
  bellButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  bellBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
    color: colors.onDanger,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 32,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  emptyDevices: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: "stretch",
    gap: spacing.sm,
  },
  emptyIcon: {
    alignSelf: "center",
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.subtitle,
    textAlign: "center",
  },
  emptyText: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  attentionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  attentionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: DANGER_ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.danger,
  },
  attentionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginTop: 2,
  },
  attentionTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
