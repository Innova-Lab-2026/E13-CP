import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables del proyecto
import AppHeader from "../../../../src/components/AppHeader";
import { getAlerts, type Alert } from "../../../../src/services/alertService";

export default function AlertsScreen() {
  const router = useRouter();
  const alerts = getAlerts();

  const handleAlertPress = (alert: Alert) => {
    router.push({
      pathname: "/(main)/(tabs)/(dashboard)/[alertId]",
      params: { alertId: alert.id },
    });
  };

  const renderIcon = (type: string) => {
    if (type === "danger") return <Text style={styles.iconText}>⚠️</Text>;
    if (type === "blocked") return <Text style={styles.iconText}>🚫</Text>;
    return <Text style={styles.iconText}>⚠️</Text>;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        {/* Cabecera reutilizable del UI Kit */}
        <AppHeader title="Mis alertas" onBackPress={() => router.back()} />

        <Text style={styles.dateHeader}>Alertas recientes</Text>

        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable 
              style={[
                styles.alertCard, 
                item.type === "warning" ? styles.warningCard : null
              ]} 
              onPress={() => handleAlertPress(item)}
            >
              <View style={[
                styles.iconContainer,
                item.type === "warning" ? styles.yellowIconBg : styles.redIconBg
              ]}>
                {renderIcon(item.type)}
              </View>
              <View style={styles.textContainer}>
                <Text style={[
                  styles.alertTitle,
                  item.type === "warning" ? styles.warningTitleText : styles.dangerTitleText
                ]}>
                  {item.title}
                </Text>
                <Text style={styles.alertSubtitle}>{item.subtitle}</Text>
                <Text style={styles.alertTime}>{item.time}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 16,
    marginTop: 8,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  warningCard: {
    borderColor: "#E5E7EB",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  redIconBg: {
    backgroundColor: "#FEE2E2",
  },
  yellowIconBg: {
    backgroundColor: "#FEF3C7",
  },
  iconText: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  dangerTitleText: {
    color: "#DC2626",
  },
  warningTitleText: {
    color: "#D97706",
  },
  alertSubtitle: {
    fontSize: 13,
    color: "#374151",
    marginTop: 2,
  },
  alertTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: "#9CA3AF",
    fontWeight: "bold",
  },
});