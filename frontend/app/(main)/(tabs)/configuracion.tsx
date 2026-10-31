
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  AppState,
} from "react-native";
import LocalVpnModule from "../../../modules/local-vpn";

export default function ConfiguracionScreen() {
  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnBusy, setVpnBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const updateVpnStatus = () => {
      setVpnEnabled(LocalVpnModule.isVpnRunning());
    };
    updateVpnStatus();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        updateVpnStatus();
      }
    });
    return () => subscription.remove();
  }, []);

  const handleVpnToggle = async (value: boolean) => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "VPN no disponible",
        "Esta función estará disponible en Android."
      );
      return;
    }

    setVpnBusy(true);
    try {
      if (value) {
        const started = await LocalVpnModule.startVpn();
        setVpnEnabled(started);
        if (!started) {
          Alert.alert(
            "Permiso necesario",
            "No se concedió el permiso para activar la VPN."
          );
        }
      } else {
        LocalVpnModule.stopVpn();
        setVpnEnabled(false);
      }
    } catch (error) {
      setVpnEnabled(LocalVpnModule.isVpnRunning());
      Alert.alert(
        "No se pudo cambiar la VPN",
        error instanceof Error ? error.message : "Ocurrió un error inesperado."
      );
    } finally {
      setVpnBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración</Text>

      <View style={styles.card}>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>Protección VPN</Text>
          <Text style={styles.description}>
            Bloquea por DNS los sitios seleccionados mientras la VPN está activa.
          </Text>
          <Text style={styles.status}>
            Estado: {vpnEnabled ? "Activada" : "Desactivada"}
          </Text>
        </View>

        <Switch
          value={vpnEnabled}
          onValueChange={handleVpnToggle}
          disabled={vpnBusy}
          trackColor={{ false: "#BDBDBD", true: "#2563EB" }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text style={styles.note}>
        Se bloquean bpplay.bet.ar, gambeta.ia y marval.com, incluidos sus
        subdominios. El filtrado es por DNS: apps con DNS cifrado propio o
        direcciones IP guardadas pueden evitarlo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 10,
  },
  note: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 16,
    lineHeight: 19,
  },
});
