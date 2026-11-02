import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import { colors, radius, spacing, typography } from "../../../../src/theme";

type Section = { title: string; paragraphs: string[] };

const TERMS: Section[] = [
  {
    title: "1. Qué es BA Protege+",
    paragraphs: [
      "BA Protege+ es un prototipo desarrollado en el marco de Innova Lab 2026 junto con LOTBA (Lotería de la Ciudad de Buenos Aires). Su objetivo es ayudar a madres, padres y personas adultas responsables a bloquear sitios de apuestas online en los celulares de chicas, chicos y adolescentes a su cargo.",
      "Al ser un prototipo, algunas funciones pueden cambiar, fallar o dejar de estar disponibles. No reemplaza el acompañamiento y el diálogo en la familia.",
    ],
  },
  {
    title: "2. Tu responsabilidad como persona adulta",
    paragraphs: [
      "Para usar la app tenés que ser mayor de edad y estar a cargo de las personas menores cuyos dispositivos vincules.",
      "Sos responsable de informarles que su celular tiene BA Protege+ instalado y de contar con el consentimiento que corresponda. Te recomendamos explicarles qué hace la app y por qué la usan.",
      "Cuidá tu contraseña y tu PIN de seguridad: con ellos se puede cambiar la protección de los dispositivos.",
    ],
  },
  {
    title: "3. Qué hace y qué no hace la app",
    paragraphs: [
      "La app bloquea los sitios del listado oficial de LOTBA y los sitios que agregues vos. El bloqueo funciona con una VPN local en el celular protegido.",
      "Ningún filtro es infalible: si la VPN se apaga, si se desinstala la app o si otra app usa su propio DNS cifrado, el bloqueo puede no funcionar.",
    ],
  },
];

const PRIVACY: Section[] = [
  {
    title: "4. Qué datos guardamos",
    paragraphs: [
      "De tu cuenta: nombre, correo electrónico, teléfono (si lo cargás). Tu contraseña y tu PIN se guardan protegidos con un hash: nunca quedan guardados como texto legible.",
      "De cada perfil protegido: el nombre que le pongas y la fecha de nacimiento.",
      "De la protección: los eventos relevantes, como los intentos de entrar a un sitio bloqueado (qué dominio, en qué dispositivo y cuándo), y los sitios que agregaste a tu lista.",
    ],
  },
  {
    title: "5. Qué datos no guardamos",
    paragraphs: [
      "No guardamos el historial de navegación, ni los sitios que no están bloqueados, ni mensajes, fotos, contactos o la ubicación del dispositivo.",
    ],
  },
  {
    title: "6. Para qué usamos los datos",
    paragraphs: [
      "Solo para que la app funcione: identificarte, mostrarte tus dispositivos, avisarte cuando hay un intento de acceso bloqueado y mantener tu lista de sitios. No los vendemos ni los usamos para publicidad.",
    ],
  },
  {
    title: "7. Cómo eliminar tu cuenta",
    paragraphs: [
      "Podés eliminar tu cuenta cuando quieras desde Configuración > Eliminar cuenta. Se borran tu cuenta, los perfiles de tus dispositivos, las alertas, el historial y los sitios que agregaste. Esta acción no se puede deshacer.",
    ],
  },
];

function SectionBlock({ section }: { section: Section }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {section.title}
      </Text>
      {section.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export default function TerminosScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Términos y políticas" />

        <View style={styles.draft} accessibilityRole="summary">
          <Ionicons name="information-circle-outline" size={20} color={colors.warningText} />
          <Text style={styles.draftText}>
            Borrador sujeto a revisión legal. Este texto acompaña al prototipo y puede cambiar antes
            de una versión definitiva.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Términos de uso</Text>
          {TERMS.map((section) => (
            <SectionBlock key={section.title} section={section} />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Política de privacidad</Text>
          {PRIVACY.map((section) => (
            <SectionBlock key={section.title} section={section} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  draft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  draftText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.warningText,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  cardTitle: {
    ...typography.title,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 15,
  },
  paragraph: {
    ...typography.body,
  },
});
