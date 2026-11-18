import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../src/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppAlert from "../../../../src/components/AppAlert";
import AppButton from "../../../../src/components/AppButton";
import AppInput from "../../../../src/components/AppInput";
import ProtectedScreenHeader from "../../../../src/components/protected/ProtectedScreenHeader";
import {
  useProtectedDevice,
  type Feedback,
} from "../../../../src/components/protected/ProtectedDeviceProvider";
import { protectedColors } from "../../../../src/components/protected/palette";
import { checkDomain } from "../../../../src/services/blocklistService";
import { errorMessage } from "../../../../src/services/api";
import { normalizeDomain } from "../../../../src/utils/domain";
import { colors, radius, shadow, spacing } from "../../../../src/theme";

/**
 * Probar un sitio: consulta si un dominio está en la lista de bloqueo de este
 * celular. Si está, registra el intento para la persona adulta y muestra el aviso
 * de sitio bloqueado (/protected/blocked). Misma lógica que tenía el Inicio.
 */
export default function ProtectedSiteCheckScreen() {
  const router = useRouter();
  const { isDevice, recordSafely } = useProtectedDevice();

  const [siteInput, setSiteInput] = useState("");
  const [siteError, setSiteError] = useState("");
  const [checking, setChecking] = useState(false);
  const [siteFeedback, setSiteFeedback] = useState<Feedback | null>(null);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/protected/configuracion");
    }
  }

  async function handleCheckSite() {
    if (checking) return;
    setSiteFeedback(null);
    const domain = normalizeDomain(siteInput);
    if (!domain) {
      setSiteError("Ingresá un sitio válido, por ejemplo sitio.com.ar");
      return;
    }

    setChecking(true);
    try {
      const result = await checkDomain(domain, isDevice ? "device" : true);
      if (result.isBlocked) {
        await recordSafely({
          eventType: "SITE_BLOCKED",
          domain: result.domain || domain,
          details: "Intento de acceso a un sitio de la lista de bloqueo",
        });
        router.push({
          pathname: "/protected/blocked",
          params: { domain: result.domain || domain },
        });
      } else {
        setSiteFeedback({ message: "Este sitio está permitido.", variant: "success" });
      }
    } catch (err) {
      setSiteFeedback({
        message: errorMessage(err, "No pudimos revisar el sitio. Intentá de nuevo."),
        variant: "error",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ProtectedScreenHeader
          title="Probar un sitio"
          subtitle="Escribí la dirección de un sitio para saber si está en la lista de bloqueo."
          onBack={goBack}
        />

        <View style={styles.card}>
          <AppInput
            label="Sitio web"
            placeholder="sitio.com.ar"
            value={siteInput}
            onChangeText={(text) => {
              setSiteInput(text);
              setSiteError("");
              setSiteFeedback(null);
            }}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={siteError}
          />
          <AppButton title="Probar" onPress={handleCheckSite} loading={checking} />
          {siteFeedback ? (
            <AppAlert message={siteFeedback.message} variant={siteFeedback.variant} />
          ) : null}
        </View>

        <Text style={styles.note}>
          La lista es el listado oficial de sitios de apuestas online de LOTBA, más los sitios
          que haya agregado la persona adulta.
        </Text>
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
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: protectedColors.cardBorder,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});
