// Mis alertas (Figma "Alertas"): agrupadas por día ("Hoy - 17 de noviembre"),
// de la más nueva a la más vieja, con las mismas tarjetas que el historial.
import { useMemo } from "react";
import { RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { Text } from "../../../../src/components/ThemedText";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../../src/components/AppHeader";
import ScreenState from "../../../../src/components/ScreenState";
import HistoryCard from "../../../../src/components/historial/HistoryCard";
import { alertVariant } from "../../../../src/components/historial/historyLook";
import { formatCardTime, groupByDay } from "../../../../src/components/historial/historyFormat";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { getAlerts, markAlertRead, type Alert } from "../../../../src/services/alertService";
import { colors, spacing } from "../../../../src/theme";

type AlertSection = { key: string; title: string; data: Alert[] };

export default function AlertsScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useAsyncResource(() => getAlerts(), []);
  const sections = useMemo<AlertSection[]>(
    () =>
      groupByDay(data ?? [], (alert) => alert.createdAt).map((group) => ({
        key: group.key,
        title: group.label,
        data: group.items,
      })),
    [data],
  );

  const handleAlertPress = (alert: Alert) => {
    if (!alert.read) {
      // El detalle también la marca al abrirse; si esta llamada falla no frenamos la navegación.
      markAlertRead(alert.id).catch(() => undefined);
    }
    router.push({
      pathname: "/(main)/(tabs)/inicio/[alertId]",
      params: { alertId: alert.id },
    });
  };

  const firstLoad = data === undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <AppHeader title="Mis alertas" />

        {firstLoad || sections.length === 0 ? (
          <ScreenState
            loading={loading && firstLoad}
            error={firstLoad ? error : null}
            onRetry={reload}
            isEmpty={!firstLoad && sections.length === 0}
            emptyTitle="No tenés alertas"
            emptyText="Te vamos a avisar acá si hay un intento de acceso a un sitio de apuestas o un cambio en la protección."
          />
        ) : null}

        {!firstLoad && sections.length > 0 ? (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.text} />
            }
            renderSectionHeader={({ section }) => (
              <Text style={styles.dateHeader} accessibilityRole="header">
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => (
              <HistoryCard
                variant={alertVariant(item.type, item.alertType)}
                title={item.title}
                description={item.subtitle}
                device=""
                time={formatCardTime(item.createdAt)}
                unread={!item.read}
                onPress={() => handleAlertPress(item)}
                accessibilityHint="Abre el detalle de la alerta"
              />
            )}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  dateHeader: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
