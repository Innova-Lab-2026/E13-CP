// Detalle de un evento del historial (Figma "Detalle del evento").
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../../src/components/AppHeader";
import ScreenState from "../../../../src/components/ScreenState";
import EventDetail from "../../../../src/components/historial/EventDetail";
import {
  eventCopy,
  formatDetailDateTime,
} from "../../../../src/components/historial/historyFormat";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { getHistoryEventById } from "../../../../src/services/historyService";
import { colors, spacing } from "../../../../src/theme";

export default function HistoryDetailScreen() {
  const router = useRouter();
  const { historyId: routeHistoryId } = useLocalSearchParams<{
    historyId?: string | string[];
  }>();
  const historyId = Array.isArray(routeHistoryId)
    ? routeHistoryId[0]
    : routeHistoryId;

  const { data: event, loading, error, reload } = useAsyncResource(
    async () => (historyId ? getHistoryEventById(historyId) : undefined),
    [historyId],
  );

  const copy = event ? eventCopy(event.eventType, event.device, event.details) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Detalle del evento" onBackPress={() => router.back()} />

        {event === undefined || !copy ? (
          <ScreenState
            loading={loading}
            error={error}
            onRetry={reload}
            isEmpty
            emptyTitle="No encontramos este evento"
            emptyText="Volvé al historial y elegí otro evento."
          />
        ) : (
          <>
            <ScreenState error={error} onRetry={reload} />
            <EventDetail
              variant={event.variant}
              title={event.title}
              sentence={copy.sentence}
              deviceName={event.device}
              site={event.domain}
              dateTime={formatDetailDateTime(event.timestamp)}
              status={copy.status}
              meaning={copy.meaning}
              guidance={copy.guidance}
              onViewHistory={() =>
                router.push({
                  pathname: "/(main)/(tabs)/historial",
                  params: { device: event.deviceId },
                })
              }
              onViewDevice={() =>
                router.push({
                  pathname: "/(main)/(tabs)/dispositivos/[deviceId]",
                  params: { deviceId: event.deviceId },
                })
              }
            />
          </>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
