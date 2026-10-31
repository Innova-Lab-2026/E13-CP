// app/tutor/dashboard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Image, Modal } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables reales del proyecto
import DeviceItem, { DeviceStatus } from "../../src/components/DeviceItem";
import AddDeviceButton from "../../src/components/AddDeviceButton";
import BottomNavigation from "../../src/components/BottomNavigation";
import GreetingHeader from "../../src/components/GreetingHeader";

// --- INTERFACES PARA EL BACKEND ---
interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
}

interface HistoryLog {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
}

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
  const [currentTab, setCurrentTab] = useState("inicio");

  // --- ESTADOS Y DATOS MOCK (MOCK DATA) ---
  const [user] = useState({ name: "Claudia!" });
  
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

  const [devices] = useState<Device[]>([
    { id: "1", name: "Paula", status: "active" },
    { id: "2", name: "Ramiro", status: "pending" },
  ]);

  const [historyLogs] = useState<HistoryLog[]>([
    {
      id: "1",
      title: "Sitio bloqueado",
      subtitle: "Ramiro • apostando-sitio.com",
      time: "14:25",
      icon: "🚫",
    },
    {
      id: "2",
      title: "Configuración actualizada",
      subtitle: "Paula • Nuevas restricciones",
      time: "12:30",
      icon: "⚙️",
    },
  ]);

  /* 
    TODO BACKEND: Ejemplo de llamado HTTP para sincronizar datos del dashboard y notificaciones:
    useEffect(() => {
      async function loadDashboardData() {
        try {
          const response = await fetch('https://api.baprotege.gob.ar/v1/tutor/dashboard', {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          const data = await response.json();
          // setDevices(data.devices);
          // setNotifications(data.notifications);
        } catch (error) {
          console.error("Error al obtener los datos del dashboard:", error);
        }
      }
      loadDashboardData();
    }, []);
  */

  const handleDevicePress = (deviceId: string, name: string) => {
    router.push({
      pathname: "/tutor/device-detail",
      params: { deviceId, name },
    });
  };

  const handleTabPress = (tabId: string) => {
    setCurrentTab(tabId);
    if (tabId === "dispositivos") router.push("/tutor/devices");
    if (tabId === "historial") router.push("/tutor/history");
    if (tabId === "configuracion") router.push("/tutor/settings/indexSettings");
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
            source={require("../../assets/protege-01.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Botón interactivo para abrir Mis Alertas */}
        <Pressable 
          style={styles.notificationBadge} 
          onPress={() => router.push("/tutor/alerts")}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {notifications.some(n => !n.read) && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      {/* Saludo componente */}
      <GreetingHeader
        name={user.name}
        subtitle="¡Qué bueno tenerte de vuelta!"
      />

      {/* Tarjeta resumen de estado general */}
      <View style={styles.statusCard}>
        <View style={styles.statusIconContainer}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>
            Todos los dispositivos están protegidos
          </Text>
          <Text style={styles.statusSubtitle}>
            {devices.length} de {devices.length} dispositivos activos
          </Text>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </View>

      {/* Encabezado sección Mis Dispositivos */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Dispositivos</Text>
        <Pressable onPress={() => router.push("/tutor/devices")}>
          <Text style={styles.linkText}>Ver todo ›</Text>
        </Pressable>
      </View>
    </View>
  );

  // --- PIE DE PÁGINA DE LA LISTA PRINCIPAL ---
  const renderListFooter = () => (
    <View>
      {/* Botón para agregar dispositivo */}
      <AddDeviceButton onPress={() => router.push("/tutor/add-device")} />

      {/* Sección Alerta / Requiere atención */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Requiere tu atención
      </Text>
      
      {/* TODO BACKEND: Dinamizar esta tarjeta con la alerta crítica o no leída de GET /api/v1/alerts */}
      <Pressable 
        style={styles.alertCard}
        onPress={() => router.push({
          pathname: "/tutor/alert-detail",
          params: {
            title: "¡Requiere tu atención!",
            subtitle: "Paula desinstaló la aplicación",
            device: "Paula",
            time: "13:00",
            type: "danger"
          }
        })}
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
        <Pressable onPress={() => router.push("/tutor/history")}>
          <Text style={styles.linkText}>Ver todo ›</Text>
        </Pressable>
      </View>

      {/* FlatList secundario para el historial */}
      <FlatList
        data={historyLogs}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Text style={styles.historyIcon}>{item.icon}</Text>
            <View style={styles.historyTextContainer}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historySubtitle}>{item.subtitle}</Text>
              <Text style={styles.historyTime}>{item.time}</Text>
            </View>
            <Text style={styles.historyArrow}>›</Text>
          </View>
        )}
      />
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
            onPress={() => handleDevicePress(item.id, item.name)}
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

      {/* Navegación Inferior fija */}
      <BottomNavigation activeTab={currentTab} onTabPress={handleTabPress} />
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
  notificationBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  historyIcon: {
    fontSize: 20,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  historySubtitle: {
    fontSize: 13,
    color: "#374151",
    marginTop: 2,
  },
  historyTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  historyArrow: {
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