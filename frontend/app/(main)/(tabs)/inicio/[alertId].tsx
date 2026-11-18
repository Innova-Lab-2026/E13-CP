// Detalle de una alerta (Figma "Detalle del evento"). Se marca como leída al abrirse.
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../../src/components/AppHeader";
import ScreenState from "../../../../src/components/ScreenState";
import EventDetail from "../../../../src/components/historial/EventDetail";
import { alertVariant } from "../../../../src/components/historial/historyLook";
import {
  eventCopy,
  formatDetailDateTime,
} from "../../../../src/components/historial/historyFormat";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { getAlertById, markAlertRead } from "../../../../src/services/alertService";
import { colors, spacing } from "../../../../src/theme";

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
      pathname: "/(main)/(tabs)/historial",
      params: { device: alert.deviceId },
    });
  };

  const handleViewDevice = () => {
    if (!alert) return;
    router.push({
      pathname: "/(main)/(tabs)/dispositivos/[deviceId]",
      params: { deviceId: alert.deviceId },
    });
  };

  const copy = alert ? eventCopy(alert.alertType, alert.device, alert.description) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Detalle del evento" />

        {!alert || !copy ? (
          <ScreenState
            loading={loading}
            error={error}
            onRetry={reload}
            isEmpty={!loading && !error && !alert}
            emptyTitle="No encontramos esta alerta"
            emptyText="Puede que ya no esté disponible. Volvé a Mis alertas para ver las más recientes."
          />
        ) : (
          <EventDetail
            variant={alertVariant(alert.type, alert.alertType)}
            title={alert.title}
            sentence={copy.sentence}
            deviceName={alert.device}
            deviceId={alert.deviceId}
            site={alert.site}
            dateTime={formatDetailDateTime(alert.createdAt)}
            status={copy.status}
            meaning={copy.meaning}
            guidance={copy.guidance}
            onViewHistory={handleViewHistory}
            onViewDevice={handleViewDevice}
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
});
