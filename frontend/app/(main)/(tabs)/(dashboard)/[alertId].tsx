// Detalle de una alerta. Se marca como leída al abrirse.
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import ScreenState from "../../../../src/components/ScreenState";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import {
  getAlertById,
  markAlertRead,
  type AlertType,
} from "../../../../src/services/alertService";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Presentation = {
  icon: IoniconName;
  status: string;
  guidance: string;
  color: string;
  textColor: string;
  background: string;
};

const PRESENTATIONS: Record<AlertType, Presentation> = {
  danger: {
    icon: "alert-circle",
    status: "Requiere tu atención",
    guidance:
      "Detectamos un intento de desactivar o saltear la protección. Te sugerimos revisar el dispositivo y conversar con calma sobre por qué la protección está activa.",
    color: colors.danger,
    textColor: colors.dangerText,
    background: colors.dangerSoft,
  },
  blocked: {
    icon: "ban",
    status: "Acceso bloqueado",
    guidance:
      "El sitio figura en el listado oficial de LOTBA y no se abrió. Puede ser un buen momento para hablar sobre los riesgos de las apuestas online, sin retos y con escucha.",
    color: colors.danger,
    textColor: colors.dangerText,
    background: colors.dangerSoft,
  },
  warning: {
    icon: "warning",
    status: "Revisá esta actividad",
    guidance:
      "Hubo un intento de instalar una aplicación o de cambiar la configuración. Mirá el historial del dispositivo para entender el contexto.",
    color: colors.warning,
    textColor: colors.warningText,
    background: colors.warningSoft,
  },
  info: {
    icon: "information-circle",
    status: "Aviso informativo",
    guidance:
      "Es un aviso sobre el estado de la protección. No hace falta que hagas nada.",
    color: colors.text,
    textColor: colors.text,
    background: colors.brandSoft,
  },
};

export default function AlertDetailScreen() {
  const router = useRouter();
  const { alertId: routeAlertId } = useLocalSearchParams<{
    alertId?: string | string[];
  }>();
  const alertId = (Array.isArray(routeAlertId) ? routeAlertId[0] : routeAlertId) ?? "";

  const { data: alert, loading, error, reload } = useAsyncResource(
    () => getAlertById(alertId),
    [alertId],
  );

  // Marcarla como leída una sola vez por alerta abierta.
  const markedId = useRef<string | null>(null);
  useEffect(() => {
    if (alert && !alert.read && markedId.current !== alert.id) {
      markedId.current = alert.id;
      markAlertRead(alert.id).catch(() => {
        markedId.current = null;
      });
    }
  }, [alert]);

  const handleViewHistory = () => {
    if (!alert) return;
    router.push({
      pathname: "/(main)/(tabs)/(historial)",
      params: { device: alert.deviceId },
    });
  };

  const handleViewDevice = () => {
    if (!alert) return;
    router.push({
      pathname: "/(main)/(tabs)/(dispositivos)/[deviceId]",
      params: { deviceId: alert.deviceId },
    });
  };

  const look = alert ? (PRESENTATIONS[alert.type] ?? PRESENTATIONS.warning) : PRESENTATIONS.info;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Detalle de alerta" />

        {!alert ? (
          <ScreenState
            loading={loading}
            error={error}
            onRetry={reload}
            isEmpty={!loading && !error && !alert}
            emptyTitle="No encontramos esta alerta"
            emptyText="Puede que ya no esté disponible. Volvé a Mis alertas para ver las más recientes."
          />
        ) : (
          <>
            <View style={styles.incidentHeader}>
              <View style={[styles.largeIcon, { backgroundColor: look.background }]}>
                <Ionicons name={look.icon} size={28} color={look.color} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.incidentTitle, { color: look.textColor }]}>
                  {alert.title}
                </Text>
                <Text style={styles.incidentSubtitle}>{alert.subtitle}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <DetailRow icon="person-outline" label="Dispositivo" value={alert.device} />

              {alert.site ? (
                <>
                  <View style={styles.separator} />
                  <DetailRow icon="link-outline" label="Sitio web" value={alert.site} />
                </>
              ) : null}

              <View style={styles.separator} />
              <DetailRow
                icon="calendar-outline"
                label="Fecha y hora"
                value={`${alert.date} · ${alert.time}`}
              />

              <View style={styles.separator} />
              <DetailRow
                icon="shield-outline"
                label="Estado"
                value={look.status}
                valueColor={look.textColor}
              />
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle} accessibilityRole="header">
                Qué pasó
              </Text>
              <Text style={styles.infoText}>{alert.description}</Text>
            </View>

            <View style={[styles.guidanceCard, { backgroundColor: look.background }]}>
              <Text style={styles.infoTitle}>Qué podés hacer</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>{look.guidance}</Text>
            </View>

            <View style={styles.buttons}>
              <AppButton title={`Ver historial de ${alert.device}`} onPress={handleViewHistory} />
              <AppButton
                title="Ver dispositivo"
                variant="secondary"
                onPress={handleViewDevice}
                accessibilityLabel={`Ver dispositivo de ${alert.device}`}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, valueColor ? { color: valueColor, fontWeight: "800" } : null]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  flex: {
    flex: 1,
  },
  incidentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  largeIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  incidentTitle: {
    ...typography.subtitle,
    fontWeight: "800",
  },
  incidentSubtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xxl,
    ...shadow.card,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    ...typography.caption,
  },
  rowValue: {
    ...typography.label,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.label,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
  },
  guidanceCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  buttons: {
    gap: spacing.md,
  },
});
