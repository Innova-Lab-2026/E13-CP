import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import InfoCard from "../../../../src/components/protected/InfoCard";
import ProtectedScreenHeader from "../../../../src/components/protected/ProtectedScreenHeader";
import { TIP_TOPICS } from "../../../../src/components/protected/navigationTips";
import { toneColors } from "../../../../src/components/protected/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing } from "../../../../src/theme";

/** "Navegá seguro" (Figma "Menú navegación - Protegido"): cuatro tarjetas de consejos. */
export default function ProtectedNavigationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProtectedScreenHeader
          title="Navegá seguro"
          subtitle="Consejos para cuidarte mientras usás internet"
        />
        <View style={styles.list}>
          {TIP_TOPICS.map((topic) => (
            <InfoCard
              key={topic.id}
              title={topic.title}
              description={topic.summary}
              icon={topic.icon}
              // Figma: "Cuidado con los engaños" lleva el octógono de advertencia
              // (el mismo de "Intento de modificación" en el historial).
              badge={
                topic.id === "enganos" ? (
                  <MaterialCommunityIcons
                    name="alert-octagon-outline"
                    size={22}
                    color={toneColors(topic.tone).icon}
                  />
                ) : undefined
              }
              tone={topic.tone}
              onPress={() =>
                router.push({
                  pathname: "/protected/navegacion/[tema]",
                  params: { tema: topic.id },
                })
              }
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  list: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
});
