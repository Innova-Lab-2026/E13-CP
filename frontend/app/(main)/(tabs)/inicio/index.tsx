// Home del adulto responsable (Figma "Home").
import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import DeviceItem from "../../../../src/components/DeviceItem";
import AddDeviceButton from "../../../../src/components/AddDeviceButton";
import GreetingHeader from "../../../../src/components/GreetingHeader";
import ScreenState from "../../../../src/components/ScreenState";
import HistoryCard from "../../../../src/components/historial/HistoryCard";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { useSession } from "../../../../src/services/session";
import { getDevices } from "../../../../src/services/deviceService";
import { getAlerts, type Alert } from "../../../../src/services/alertService";
import { getHistoryEvents } from "../../../../src/services/historyService";
import { formatIsoDate } from "../../../../src/utils/date";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useSession();
  const firstName = session?.profile.name?.trim().split(/\s+/)[0] || "";

  const devices = useAsyncResource(() => getDevices(), []);
  const alerts = useAsyncResource(() => getAlerts(), []);
  const history = useAsyncResource(
    async () => (await getHistoryEvents()).slice(0, 2),
    [],
  );

  const deviceList = devices.data ?? [];
  const protectedCount = deviceList.filter((device) => device.status === "active").length;
  const hasUnread = (alerts.data ?? []).some((alert) => !alert.read);

  // La alerta sin leer más reciente que pide intervención (las alertas vienen ordenadas de la más nueva a la más vieja).
  const attentionAlert = useMemo<Alert | undefined>(
    () =>
      (alerts.data ?? []).find(
        (alert) => !alert.read && (alert.type === "danger" || alert.type === "blocked"),
      ),
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

  const renderStatusCard = () => {
    const total = deviceList.length;
    const allProtected = total > 0 && protectedCount === total;
    const subtitle =
      total === 0
        ? "Todavía no agregaste dispositivos."
        : allProtected
          ? "La protección está activa en todos."
          : "Revisá los que todavía no están protegidos.";

    return (
      <Pressable
        style={({ pressed }) => [styles.statusCard, pressed && styles.pressed]}
        onPress={() => router.push("/(main)/(tabs)/dispositivos")}
        accessibilityRole="button"
        accessibilityLabel={`${protectedCount} de ${total} dispositivos protegidos. ${subtitle}`}
      >
        <View
          style={[
            styles.statusIcon,
            { backgroundColor: allProtected ? colors.successSoft : colors.brandSoft },
          ]}
        >
          <Ionicons
            name={allProtected ? "shield-checkmark" : "shield-outline"}
            size={22}
            color={allProtected ? colors.successText : colors.text}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.statusTitle}>
            {protectedCount} de {total} dispositivos protegidos
          </Text>
          <Text style={styles.statusSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    );
  };

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Mis dispositivos
          </Text>
          <Pressable
            onPress={() => router.push("/(main)/(tabs)/dispositivos")}
            accessibilityRole="button"
            accessibilityLabel="Ver todos los dispositivos"
            hitSlop={8}
          >
            <Text style={styles.linkText}>Ver todo</Text>
          </Pressable>
        </View>

        {deviceList.map((device) => (
          <DeviceItem
            key={device.id}
            name={device.name}
            status={device.status}
            birthDate={device.birthDate ? formatIsoDate(device.birthDate) : undefined}
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
    const isDanger = attentionAlert.type === "danger";

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Requiere tu atención
        </Text>
        <Pressable
          style={({ pressed }) => [styles.attentionCard, pressed && styles.pressed]}
          onPress={() =>
            router.push({
              pathname: "/(main)/(tabs)/inicio/[alertId]",
              params: { alertId: attentionAlert.id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`${attentionAlert.title}. ${attentionAlert.subtitle}. Ver detalle`}
        >
          <View style={styles.attentionIcon}>
            <Ionicons name={isDanger ? "alert-circle" : "ban"} size={22} color={colors.danger} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.attentionTitle}>{attentionAlert.title}</Text>
            <Text style={styles.attentionSubtitle} numberOfLines={2}>
              {attentionAlert.subtitle}
            </Text>
            <Text style={styles.caption}>
              {attentionAlert.date} · {attentionAlert.time}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  };

  const renderHistory = () => {
    const events = history.data ?? [];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Historial
          </Text>
          <Pressable
            onPress={() => router.push("/(main)/(tabs)/historial")}
            accessibilityRole="button"
            accessibilityLabel="Ver todo el historial"
            hitSlop={8}
          >
            <Text style={styles.linkText}>Ver todo</Text>
          </Pressable>
        </View>

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
              description={event.description}
              time={`${event.date} · ${event.time}`}
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
            accessibilityLabel={hasUnread ? "Alertas, tenés alertas sin leer" : "Alertas"}
            hitSlop={6}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {hasUnread ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        <GreetingHeader name={firstName} subtitle="Qué bueno tenerte de vuelta." />

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
    width: 120,
    height: 40,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadow.card,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    ...typography.subtitle,
  },
  statusSubtitle: {
    ...typography.body,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
  },
  linkText: {
    ...typography.label,
    textDecorationLine: "underline",
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
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  attentionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionTitle: {
    ...typography.label,
    color: colors.dangerText,
    fontWeight: "800",
  },
  attentionSubtitle: {
    ...typography.body,
    color: colors.text,
    marginTop: 2,
  },
  caption: {
    ...typography.caption,
    marginTop: 2,
  },
});
