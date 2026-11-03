import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/services/session";
import { homeRouteFor } from "../../src/navigation";
import { colors } from "../../src/theme";

/**
 * Área de la persona adulta. Solo se muestra con una sesión en modo "adulto" y
 * con el PIN ya creado: un celular en modo protegido usa la misma cuenta, así
 * que sin esta guardia se podría entrar escribiendo la URL.
 */
export default function MainLayout() {
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

  if (session.mode !== "adulto" || !session.profile.hasPin) {
    return <Redirect href={homeRouteFor(session)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
