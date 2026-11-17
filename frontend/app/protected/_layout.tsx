import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/services/session";
import { deviceSessionEndRoute, useDeviceSession } from "../../src/services/deviceSession";
import { homeRouteFor } from "../../src/navigation";
import { colors } from "../../src/theme";

/**
 * Pantallas del celular protegido. Se muestran con la credencial propia de un
 * celular vinculado con un código, o con una sesión en modo "dispositivo_protegido"
 * (la forma anterior de vincular); cualquier otro caso vuelve a la pantalla que corresponde.
 */
export default function ProtectedLayout() {
  const { session, loading } = useSession();
  const { deviceSession, loading: deviceLoading } = useDeviceSession();

  if (loading || deviceLoading) {
    return (
      <View style={styles.loading} accessibilityLabel="Cargando">
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!deviceSession) {
    if (!session) {
      return <Redirect href={deviceSessionEndRoute() ?? "/login"} />;
    }

    if (session.mode !== "dispositivo_protegido") {
      return <Redirect href={homeRouteFor(session)} />;
    }
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundWarm },
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundWarm,
  },
});
