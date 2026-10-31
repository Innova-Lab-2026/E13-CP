import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import { getHistoryEventById } from "../../../../src/services/historyService";

export default function HistoryDetailScreen() {
  const router = useRouter();
  const { historyId: routeHistoryId } = useLocalSearchParams<{
    historyId?: string | string[];
  }>();
  const historyId = Array.isArray(routeHistoryId)
    ? routeHistoryId[0]
    : routeHistoryId;
  const event = historyId ? getHistoryEventById(historyId) : undefined;

  const handleViewDevice = () => {
    if (!event) return;
    router.push({
      pathname: "/(main)/(tabs)/(dispositivos)/[deviceId]",
      params: { deviceId: event.deviceId },
    });
  };

  const eventPresentation = event
    ? eventPresentations[event.variant]
    : eventPresentations.alert;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Detalle de actividad"
          onBackPress={() => router.back()}
        />

        {event ? (
          <>
            <View style={styles.eventHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: eventPresentation.backgroundColor },
                ]}
              >
                <Text style={styles.icon}>{eventPresentation.icon}</Text>
              </View>
              <View style={styles.eventHeaderText}>
                <Text
                  style={[
                    styles.title,
                    { color: eventPresentation.color },
                  ]}
                >
                  {event.title}
                </Text>
                <Text style={styles.subtitle}>{event.date} · {event.time}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.rowIcon}>👤</Text>
                <Text style={styles.rowText}>
                  Perfil de <Text style={styles.bold}>{event.device}</Text>
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Text style={styles.rowIcon}>🏷️</Text>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Categoría</Text>
                  <Text style={styles.rowText}>
                    {eventPresentation.category}
                  </Text>
                </View>
              </View>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Text style={styles.rowIcon}>🕒</Text>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Fecha y hora</Text>
                  <Text style={styles.rowText}>
                    {event.date} · {event.time}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>DETALLE DE LA ACTIVIDAD</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>

            <AppButton
              title={`Ver dispositivo de ${event.device}`}
              onPress={handleViewDevice}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.title}>No encontramos esta actividad</Text>
            <Text style={styles.description}>
              Volvé al historial y seleccioná un evento disponible.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const eventPresentations = {
  blocked: {
    icon: "🚫",
    category: "Bloqueos",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  alert: {
    icon: "⚠️",
    category: "Seguridad",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  settings: {
    icon: "⚙️",
    category: "Configuración",
    color: "#475569",
    backgroundColor: "#E5E7EB",
  },
  protected: {
    icon: "🛡️",
    category: "Seguridad",
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
} as const;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF2",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 30,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
  },
  eventHeaderText: {
    flex: 1,
  },
  title: {
    color: "#1F2937",
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 5,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  rowIcon: {
    width: 24,
    fontSize: 18,
    textAlign: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 3,
  },
  rowText: {
    color: "#1F2937",
    fontSize: 14,
  },
  bold: {
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#1F2937",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 21,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 12,
    gap: 8,
  },
});
