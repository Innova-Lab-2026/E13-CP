import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppInput from "../../src/components/AppInput";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import PinInput from "../../src/components/PinInput";
import {
  claimDevice,
  LINK_CODE_REGEX,
  normalizeLinkCode,
} from "../../src/services/myDeviceService";
import { saveDeviceSession, useDeviceSession } from "../../src/services/deviceSession";
import { clearSession, useSession } from "../../src/services/session";
import { errorMessage } from "../../src/services/api";
import { APK_DOWNLOAD_URL, appLinkUrl } from "../../src/appLinks";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";

const CODE_LENGTH = 8;

const IS_WEB = Platform.OS === "web";

/**
 * Navegador de un celular Android (por ejemplo, el enlace que compartió la
 * persona adulta abierto desde WhatsApp). Ahí conviene vincular desde la app,
 * que es la que bloquea: desde el navegador el código se gasta sin proteger nada.
 */
const IS_ANDROID_BROWSER =
  IS_WEB && typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent ?? "");

/** En la web se navega en la misma pestaña: así Android ofrece abrir la app o bajar la APK. */
function openExternal(url: string) {
  if (IS_WEB && typeof window !== "undefined") {
    window.location.assign(url);
    return;
  }
  Linking.openURL(url).catch(() => {
    // Si no se puede abrir, la persona sigue en esta pantalla y puede escribir el código.
  });
}

/** Lo que se escribe o llega por el enlace: mayúsculas, sin espacios ni guiones. */
function cleanCode(value: string): string {
  return normalizeLinkCode(value).slice(0, CODE_LENGTH);
}

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Vinculá este celular: el celular del menor se vincula con el código que generó
 * la persona adulta y su PIN, sin iniciar sesión con su cuenta. El código puede
 * llegar precompletado por el enlace (baprotege://vincular?code=... o
 * /app/vincular?code=...). El PIN nunca viaja en el enlace.
 */
export default function LinkWithCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const linkedCode = first(params.code);
  const { session } = useSession();
  const { deviceSession, loading } = useDeviceSession();

  const [code, setCode] = useState(() => cleanCode(linkedCode ?? ""));
  const [codeError, setCodeError] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linked, setLinked] = useState(false);
  // En el navegador de un Android, la persona eligió vincular igual desde acá.
  const [useBrowser, setUseBrowser] = useState(false);

  // Si se abre otro enlace con la pantalla ya abierta, se usa el código nuevo.
  useEffect(() => {
    if (linkedCode) setCode(cleanCode(linkedCode));
  }, [linkedCode]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator color={colors.text} accessibilityLabel="Cargando" />
      </SafeAreaView>
    );
  }

  // Este celular ya está vinculado: se va directo a su pantalla protegida.
  if (deviceSession && !linked) {
    return <Redirect href="/protected" />;
  }

  async function handleLink() {
    if (submitting) return;

    const normalized = normalizeLinkCode(code);
    let valid = true;
    setFeedback(null);
    setCodeError("");
    setPinError("");

    if (!LINK_CODE_REGEX.test(normalized)) {
      setCodeError("Revisá el código: tiene 8 letras y números");
      valid = false;
    }
    if (pin.length !== 4) {
      setPinError("Ingresá los 4 dígitos del PIN.");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      const result = await claimDevice(normalized, pin);
      // El celular queda protegido con su propia credencial: si había una cuenta
      // de adulto abierta acá, se cierra para que el menor no pueda usarla.
      if (session) {
        await clearSession();
      }
      setLinked(true);
      await saveDeviceSession({
        kind: "device",
        deviceId: result.device.id,
        deviceName: result.device.deviceName,
        deviceAccessToken: result.deviceAccessToken,
        linkedAt: new Date().toISOString(),
      });
      router.replace("/protected");
    } catch (error) {
      setPin("");
      setFeedback(
        errorMessage(
          error,
          "No pudimos vincular este celular. Revisá tu conexión e intentá de nuevo.",
        ),
      );
      setSubmitting(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  if (IS_ANDROID_BROWSER && !useBrowser) {
    const validCode = LINK_CODE_REGEX.test(code) ? code : undefined;
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/protege-01.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="BA Protege+"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Vinculá este celular
            </Text>
            <Text style={styles.subtitle}>
              Para proteger este celular, vinculalo desde la app BA Protege+. En el
              navegador no podemos bloquear sitios: eso lo hace la app.
            </Text>
          </View>

          <View style={styles.card}>
            {validCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Tu código</Text>
                <Text
                  style={styles.codeText}
                  selectable
                  accessibilityLabel={`Código de vinculación: ${validCode.split("").join(" ")}`}
                >
                  {validCode}
                </Text>
                <Text style={styles.codeHint}>Al abrir la app, ya queda escrito.</Text>
              </View>
            ) : null}
            <AppButton title="Abrir la app" onPress={() => openExternal(appLinkUrl(validCode))} />
            <AppButton
              title="Descargar la app para Android"
              variant="secondary"
              onPress={() => openExternal(APK_DOWNLOAD_URL)}
            />
            <Text style={styles.openHint}>
              Después de instalarla, volvé a esta página y tocá «Abrir la app», o abrila y
              tocá «Vincular con un código».
            </Text>
          </View>

          <View style={styles.back}>
            <AppButton
              title="Vincular desde el navegador igual"
              variant="tertiary"
              onPress={() => setUseBrowser(true)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/protege-01.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="BA Protege+"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Vinculá este celular
            </Text>
            <Text style={styles.subtitle}>
              Pedile a la persona adulta el código que aparece en su celular, en
              Dispositivos. Con ese código y su PIN de seguridad, este celular queda
              protegido sin usar su cuenta.
            </Text>
          </View>

          {IS_WEB ? (
            <AppAlert
              variant="warning"
              message="En el navegador no podemos bloquear sitios: eso lo hace la app de Android. Si vinculás desde acá, el código se usa y la persona adulta va a ver este celular como vinculado, pero no va a quedar protegido."
            />
          ) : null}

          {session ? (
            <AppAlert
              variant="info"
              message={`Este celular tiene abierta la cuenta de ${session.profile.name}. Si lo vinculás, esa sesión se cierra y el celular queda protegido.`}
            />
          ) : null}

          <View style={styles.card}>
            <AppInput
              label="Código de vinculación"
              placeholder="Ej.: ABCD2345"
              value={code}
              onChangeText={(text) => {
                setCode(cleanCode(text));
                setCodeError("");
                setFeedback(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={CODE_LENGTH}
              error={codeError}
              editable={!submitting}
            />

            <PinInput
              value={pin}
              onChange={(value) => {
                setPin(value);
                setPinError("");
                setFeedback(null);
              }}
              label="PIN de seguridad de la persona adulta"
              error={pinError}
            />
            <Text style={styles.hint}>El PIN no se guarda en este celular.</Text>

            {feedback ? <AppAlert message={feedback} variant="error" /> : null}

            <AppButton title="Vincular" onPress={handleLink} loading={submitting} />
          </View>

          <View style={styles.back}>
            <AppButton
              title="Volver"
              variant="tertiary"
              onPress={goBack}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 125,
    height: 55,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xs,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  hint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  openHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  codeBox: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderWidth: 2,
    borderColor: colors.brand,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  codeText: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 4,
    color: colors.text,
    textAlign: "center",
  },
  codeHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  back: {
    marginTop: spacing.lg,
  },
});
