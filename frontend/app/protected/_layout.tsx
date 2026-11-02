import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/services/session";
import { homeRouteFor } from "../../src/navigation";
import { colors } from "../../src/theme";

/**
 * Pantallas del celular protegido. Solo se muestran con una sesión en modo
 * "dispositivo_protegido"; cualquier otro caso vuelve a la pantalla que corresponde.
 */
export default function ProtectedLayout() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View style={styles.loading} accessibilityLabel="Cargando">
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.mode !== "dispositivo_protegido") {
    return <Redirect href={homeRouteFor(session)} />;
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
