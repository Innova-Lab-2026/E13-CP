import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables del proyecto
import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import {
  getAlertById,
  type AlertType,
} from "../../../../src/services/alertService";

export default function AlertDetailScreen() {
  const router = useRouter();
  const { alertId: routeAlertId } = useLocalSearchParams<{
    alertId?: string | string[];
  }>();
  const alertId = Array.isArray(routeAlertId)
    ? routeAlertId[0]
    : routeAlertId;
  const alert = alertId ? getAlertById(alertId) : undefined;
  const alertPresentation = alertPresentations[alert?.type ?? "danger"];

  const handleViewHistory = () => {
    router.push({
      pathname: "/(main)/(tabs)/(historial)",
      params: alert ? { device: alert.device } : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Detalle de alerta" onBackPress={() => router.back()} />

        {alert ? (
          <>
            <View style={styles.incidentHeader}>
              <View
                style={[
                  styles.largeIconContainer,
                  { backgroundColor: alertPresentation.backgroundColor },
                ]}
              >
                <Text style={styles.largeIcon}>{alertPresentation.icon}</Text>
              </View>
              <View style={styles.incidentTextContainer}>
                <Text
                  style={[
                    styles.incidentTitle,
                    { color: alertPresentation.color },
                  ]}
                >
                  {alert.title}
                </Text>
                <Text style={styles.incidentSubtitle}>{alert.subtitle}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.rowIcon}>👤</Text>
                <Text style={styles.rowLabel}>
                  Dispositivo de <Text style={styles.boldText}>{alert.device}</Text>
                </Text>
              </View>

              {alert.site ? (
                <>
                  <View style={styles.separator} />
                  <View style={styles.detailRow}>
                    <Text style={styles.rowIcon}>🔗</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowSubLabel}>Sitio web</Text>
                      <Text style={styles.rowValue}>{alert.site}</Text>
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Text style={styles.rowIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowSubLabel}>Fecha y hora</Text>
                  <Text style={styles.rowValue}>{alert.date} · {alert.time}</Text>
                </View>
              </View>

              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Text style={styles.rowIcon}>🛡️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowSubLabel}>Estado</Text>
                  <Text
                    style={[
                      styles.statusBlockedText,
                      { color: alertPresentation.color },
                    ]}
                  >
                    {alertPresentation.icon} {alertPresentation.status}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>DETALLE DE LA ALERTA</Text>
              <Text style={styles.infoDescription}>{alert.description}</Text>
            </View>

            <View style={styles.buttonContainer}>
              <AppButton
                title={`Ver historial de ${alert.device}`}
                onPress={handleViewHistory}
              />
            </View>
          </>
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>No encontramos esta alerta</Text>
            <Text style={styles.infoDescription}>
              Volvé a Mis alertas y seleccioná una alerta disponible.
            </Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const alertPresentations: Record<
  AlertType,
  {
    icon: string;
    status: string;
    color: string;
    backgroundColor: string;
  }
> = {
  danger: {
    icon: "⚠️",
    status: "Requiere atención",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  blocked: {
    icon: "🚫",
    status: "Acceso bloqueado",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  warning: {
    icon: "⚙️",
    status: "Intento de modificación",
    color: "#D97706",
    backgroundColor: "#FEF3C7",
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 30,
  },
  incidentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
    gap: 16,
  },
  largeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  largeIcon: {
    fontSize: 24,
  },
  incidentTextContainer: {
    flex: 1,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incidentSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 4,
    lineHeight: 18,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  rowIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  rowLabel: {
    fontSize: 14,
    color: "#1F2937",
  },
  boldText: {
    fontWeight: "bold",
  },
  rowSubLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginTop: 2,
  },
  statusBlockedText: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 8,
  },
});