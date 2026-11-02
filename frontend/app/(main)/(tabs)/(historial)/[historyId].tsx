import { Fragment } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import ScreenState from "../../../../src/components/ScreenState";
import type { HistoryVariant } from "../../../../src/components/historial/HistoryCard";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { getHistoryEventById } from "../../../../src/services/historyService";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const eventPresentations: Record<
  HistoryVariant,
  { icon: IconName; color: string; backgroundColor: string }
> = {
  blocked: {
    icon: "ban",
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  alert: {
    icon: "alert-circle",
    color: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  settings: {
    icon: "settings",
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
  },
  protected: {
    icon: "shield-checkmark",
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
};

const categoryLabels = {
  blocked: "Bloqueos",
  security: "Seguridad",
  settings: "Configuración",
} as const;

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

  const handleViewDevice = () => {
    if (!event) return;
    router.push({
      pathname: "/(main)/(tabs)/(dispositivos)/[deviceId]",
      params: { deviceId: event.deviceId },
    });
  };

  const presentation = event
    ? eventPresentations[event.variant] ?? eventPresentations.settings
    : eventPresentations.settings;

  const rows: { icon: IconName; label: string; value: string }[] = event
    ? [
        { icon: "person-outline", label: "Perfil", value: event.device },
        {
          icon: "pricetag-outline",
          label: "Categoría",
          value: categoryLabels[event.category] ?? "Actividad",
        },
        {
          icon: "time-outline",
          label: "Fecha y hora",
          value: `${event.date} · ${event.time}`,
        },
        ...(event.domain
          ? [{ icon: "globe-outline" as IconName, label: "Sitio", value: event.domain }]
          : []),
      ]
    : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Detalle de actividad"
          onBackPress={() => router.back()}
        />

        {event === undefined ? (
          <ScreenState
            loading={loading}
            error={error}
            onRetry={reload}
            isEmpty
            emptyTitle="No encontramos esta actividad"
            emptyText="Volvé al historial y elegí otro evento."
          />
        ) : (
          <>
            <ScreenState error={error} onRetry={reload} />

            <View style={styles.eventHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: presentation.backgroundColor },
                ]}
              >
                <Ionicons
                  name={presentation.icon}
                  size={26}
                  color={presentation.color}
                />
              </View>
              <View style={styles.eventHeaderText}>
                <Text style={styles.title} accessibilityRole="header">
                  {event.title}
                </Text>
                <Text style={styles.subtitle}>
                  {event.date} · {event.time}
                </Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              {rows.map((row, index) => (
                <Fragment key={row.label}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <View
                    style={styles.detailRow}
                    accessible
                    accessibilityLabel={`${row.label}: ${row.value}`}
                  >
                    <Ionicons
                      name={row.icon}
                      size={20}
                      color={colors.textMuted}
                      style={styles.rowIcon}
                    />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <Text style={styles.rowText}>{row.value}</Text>
                    </View>
                  </View>
                </Fragment>
              ))}
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Qué pasó</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>

            <AppButton
              title={`Ver dispositivo de ${event.device}`}
              onPress={handleViewDevice}
              accessibilityLabel={`Ver dispositivo de ${event.device}`}
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
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  eventHeaderText: {
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    fontSize: 17,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadow.card,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    width: 24,
    textAlign: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: 3,
  },
  rowText: {
    color: colors.text,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  descriptionSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
  },
});
