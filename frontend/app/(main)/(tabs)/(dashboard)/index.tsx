// app/tutor/dashboard.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Modal,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables reales del proyecto
import DeviceItem from "../../../../src/components/DeviceItem";
import AddDeviceButton from "../../../../src/components/AddDeviceButton";
import GreetingHeader from "../../../../src/components/GreetingHeader";
import { getDevices, type Device } from "../../../../src/services/deviceService";
import HistoryCard from "../../../../src/components/historial/HistoryCard";
import { getHistoryEvents } from "../../../../src/services/historyService";

// TODO BACKEND: Estructura esperada para el modelo de notificaciones de la API
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string | string[] }>();
  const userName = (Array.isArray(name) ? name[0] : name)?.trim() || "tutor";

  // --- ESTADOS Y DATOS MOCK (MOCK DATA) ---
  // Estado para controlar la visibilidad del panel/modal de notificaciones
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);

  // TODO BACKEND: Reemplazar este estado inicial por un fetch a GET /api/v1/notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Desinstalación detectada",
      message: "Paula desinstaló la aplicación de control parental.",
      time: "13:00",
      read: false,
    },
    {
      id: "2",
      title: "Intento de sitio bloqueado",
      message: "Ramiro intentó acceder a un sitio de apuestas.",
      time: "14:25",
      read: true,
    },
  ]);

  const [devices, setDevices] = useState(getDevices);

  useFocusEffect(
    useCallback(() => {
      setDevices(getDevices());
    }, []),
  );

  const historyLogs = getHistoryEvents().slice(0, 2);

  const handleLogout = () => {
    router.replace("/(public)/login");
  };

  // TODO BACKEND: Función para marcar notificación como leída en la API (PATCH /api/v1/notifications/:id)
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(item => (item.id === id ? { ...item, read: true } : item))
    );
  };

  // --- CABECERA DE LA LISTA PRINCIPAL ---
  const renderListHeader = () => (
    <View>
      {/* Top Bar: Isologotipo de la App y Alerta de Notificaciones */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../../assets/protege-01.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topBarActions}>
          <Pressable
            style={styles.notificationBadge}
            onPress={() => router.push("/(main)/(tabs)/(dashboard)/alerts")}
            accessibilityRole="button"
            accessibilityLabel="Abrir alertas"
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {notifications.some(n => !n.read) && (
              <View style={styles.notificationDot} />
            )}
          </Pressable>
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>

      {/* Saludo componente */}
      <GreetingHeader
        name={userName}
        subtitle="¡Qué bueno tenerte de vuelta!"
      />

      {/* Tarjeta resumen de estado general */}
      <View style={styles.statusCard}>
        <View style={styles.statusIconContainer}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>
            Dispositivos protegidos
          </Text>
          <Text style={styles.statusSubtitle}>
            {devices.filter((device) => device.status === "active").length} de{" "}
            {devices.length} dispositivos activos
          </Text>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </View>

      {/* Encabezado sección Mis Dispositivos */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Dispositivos</Text>
        <Pressable
          onPress={() => router.push("/(main)/(tabs)/(dispositivos)")}
        >
          <Text style={styles.linkText}>Ver todo ›</Text>
        </Pressable>
      </View>
    </View>
  );

  // --- PIE DE PÁGINA DE LA LISTA PRINCIPAL ---
  const renderListFooter = () => (
    <View>
      {/* Botón para agregar dispositivo */}
      <AddDeviceButton
        onPress={() =>
          router.push("/(main)/(tabs)/(dispositivos)/add-device")
        }
      />

      {/* Sección Alerta / Requiere atención */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Requiere tu atención
      </Text>

      {/* TODO BACKEND: Dinamizar esta tarjeta con la alerta crítica o no leída de GET /api/v1/alerts */}
      <Pressable
        style={styles.alertCard}
        onPress={() =>
          router.push({
            pathname: "/(main)/(tabs)/(dashboard)/[alertId]",
            params: { alertId: "1" },
          })
        }
      >
        <View style={styles.alertIconContainer}>
          <Text style={styles.alertIcon}>⚠️</Text>
        </View>
        <View style={styles.alertTextContainer}>
          <Text style={styles.alertTitle}>¡Requiere tu atención!</Text>
          <Text style={styles.alertSubtitle}>
            Paula desinstaló la aplicación
          </Text>
          <Text style={styles.alertTime}>13:00</Text>
        </View>
        <Text style={styles.alertArrow}>›</Text>
      </Pressable>

      {/* Encabezado sección Historial */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Historial</Text>
        <Pressable onPress={() => router.push("/(main)/(tabs)/(historial)")}>
          <Text style={styles.linkText}>Ver todo ›</Text>
        </Pressable>
      </View>

      {historyLogs.map((event) => (
        <HistoryCard
          key={event.id}
          variant={event.variant}
          title={event.title}
          description={event.description}
          time={`${event.date} · ${event.time}`}
          device={event.device}
          onPress={() =>
            router.push({
              pathname: "/(main)/(tabs)/(historial)/[historyId]",
              params: { historyId: event.id },
            })
          }
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* FlatList principal */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DeviceItem
            name={item.name}
            status={item.status}
            birthDate={item.birthDate}
            onPress={() =>
              router.push({
                pathname: "/(main)/(tabs)/(dispositivos)/[deviceId]",
                params: { deviceId: item.id },
              })
            }
          />
        )}
      />

      {/* --- PANEL / MODAL DE NOTIFICACIONES --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isNotificationModalVisible}
        onRequestClose={() => setIsNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificaciones</Text>
              <Pressable onPress={() => setIsNotificationModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            {/* Lista de Notificaciones (Mock / Backend Ready) */}
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.notificationItem, !item.read && styles.unreadNotification]}
                  onPress={() => handleMarkAsRead(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifMessage}>{item.message}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                  {!item.read && <View style={styles.blueDot} />}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No tenés notificaciones nuevas.</Text>
              }
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  logoContainer: {
    justifyContent: "center",
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logoutButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
  },
  logoutButtonText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
  },
  bellIcon: {
    fontSize: 18,
  },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  shieldIcon: {
    fontSize: 20,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#065F46",
  },
  statusSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: "#047857",
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  linkText: {
    fontSize: 14,
    color: "#1C1C1C",
    fontWeight: "600",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  alertIcon: {
    fontSize: 18,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#DC2626",
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
  alertArrow: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  // Estilos del Modal de Notificaciones
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeButton: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6B7280",
    padding: 4,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  unreadNotification: {
    backgroundColor: "#F9FAFB",
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
  },
  notifMessage: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 20,
  },
});