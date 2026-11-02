// Mis alertas (Figma "Alertas"): agrupadas por día, de la más nueva a la más vieja.
import React, { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import ScreenState from "../../../../src/components/ScreenState";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import {
  getAlerts,
  markAlertRead,
  type Alert,
  type AlertType,
} from "../../../../src/services/alertService";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const ALERT_ICONS: Record<
  AlertType,
  { icon: IoniconName; color: string; background: string; titleColor: string }
> = {
  danger: {
    icon: "alert-circle",
    color: colors.danger,
    background: colors.dangerSoft,
    titleColor: colors.dangerText,
  },
  blocked: {
    icon: "ban",
    color: colors.danger,
    background: colors.dangerSoft,
    titleColor: colors.dangerText,
  },
  warning: {
    icon: "warning",
    color: colors.warning,
    background: colors.warningSoft,
    titleColor: colors.warningText,
  },
  info: {
    icon: "information-circle",
    color: colors.text,
    background: colors.brandSoft,
    titleColor: colors.text,
  },
};

type AlertSection = { title: string; data: Alert[] };

/** Agrupa respetando el orden recibido (ya viene de más nueva a más vieja). */
function groupByDate(alerts: Alert[]): AlertSection[] {
  const sections: AlertSection[] = [];
  const byTitle = new Map<string, AlertSection>();
  for (const alert of alerts) {
    const title = alert.date || "Sin fecha";
    let section = byTitle.get(title);
    if (!section) {
      section = { title, data: [] };
      byTitle.set(title, section);
      sections.push(section);
    }
    section.data.push(alert);
  }
  return sections;
}

export default function AlertsScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useAsyncResource(() => getAlerts(), []);
  const sections = useMemo(() => groupByDate(data ?? []), [data]);

  const handleAlertPress = (alert: Alert) => {
    if (!alert.read) {
      // El detalle también la marca al abrirse; si esta llamada falla no frenamos la navegación.
      markAlertRead(alert.id).catch(() => undefined);
    }
    router.push({
      pathname: "/(main)/(tabs)/(dashboard)/[alertId]",
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
              <RefreshControl
                refreshing={loading}
                onRefresh={reload}
                tintColor={colors.text}
              />
            }
            renderSectionHeader={({ section }) => (
              <Text style={styles.dateHeader} accessibilityRole="header">
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => {
              const look = ALERT_ICONS[item.type] ?? ALERT_ICONS.warning;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.alertCard,
                    !item.read && styles.unreadCard,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleAlertPress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.read ? "" : "Sin leer. "}${item.title}. ${item.subtitle}. ${item.time}`}
                >
                  <View style={[styles.iconContainer, { backgroundColor: look.background }]}>
                    <Ionicons name={look.icon} size={22} color={look.color} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[styles.alertTitle, { color: look.titleColor }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.alertSubtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                    <Text style={styles.alertTime}>{item.time}</Text>
                  </View>
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              );
            }}
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
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  unreadCard: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  alertTitle: {
    ...typography.label,
    fontWeight: "800",
  },
  alertSubtitle: {
    ...typography.body,
    color: colors.text,
    marginTop: 2,
  },
  alertTime: {
    ...typography.caption,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
});
