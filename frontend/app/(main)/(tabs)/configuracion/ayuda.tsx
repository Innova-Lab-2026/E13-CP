import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import { colors, radius, spacing, typography } from "../../../../src/theme";

type Faq = { question: string; answer: string };

const FAQS: Faq[] = [
  {
    question: "¿Cómo vinculo el celular de mi hijo o hija?",
    answer:
      "Primero creá su perfil desde la pestaña Dispositivos con su nombre y fecha de nacimiento. Después, en su celular, instalá BA Protege+, ingresá con tu misma cuenta y elegí el modo «Dispositivo protegido». Seleccioná el perfil que creaste y confirmá la vinculación con tu PIN de seguridad. Cuando termine, el dispositivo aparece como activo en tu lista.",
  },
  {
    question: "¿Qué es el PIN de seguridad y para qué sirve?",
    answer:
      "Es un número de 4 dígitos que elegís vos y que solo debería conocer una persona adulta. Se pide para confirmar la vinculación de un dispositivo y para cambiar la protección desde el celular del menor. Podés cambiarlo cuando quieras desde Configuración > PIN de seguridad.",
  },
  {
    question: "¿Qué sitios se bloquean y de dónde sale la lista?",
    answer:
      "Se bloquean los sitios de apuestas online que figuran en el listado oficial de LOTBA (Lotería de la Ciudad de Buenos Aires), que se actualiza de forma periódica. Además podés sumar sitios propios desde Configuración > Sitios bloqueados. En esa pantalla ves cuántos sitios tiene el listado oficial y cuándo se actualizó por última vez.",
  },
  {
    question: "¿Qué ve mi hijo o hija cuando entra a un sitio bloqueado?",
    answer:
      "El sitio no se abre y BA Protege+ le explica que es un sitio de apuestas bloqueado para cuidarlo. La idea es que la app sea una excusa para conversar sobre el tema, no un castigo.",
  },
  {
    question: "¿Me entero si intenta entrar a un sitio bloqueado?",
    answer:
      "Sí. Cada intento de acceso a un sitio bloqueado genera una alerta en tu pestaña Inicio y queda registrado en tu Historial, con el sitio, el dispositivo y la hora.",
  },
  {
    question: "¿Qué pasa si desinstala la app o apaga la VPN?",
    answer:
      "BA Protege+ bloquea los sitios con una VPN local que filtra las direcciones en el propio celular (por ahora solo en Android). Si la VPN se apaga o se desinstala la app, el bloqueo deja de funcionar en ese celular. El filtro tampoco alcanza a apps que usan su propio DNS cifrado. Por eso te recomendamos acordar el uso de la app con tu hijo o hija y revisar de vez en cuando que el dispositivo siga activo.",
  },
  {
    question: "¿Qué datos guarda BA Protege+?",
    answer:
      "Guardamos lo mínimo para funcionar: tu nombre, correo y teléfono (si lo cargás), el nombre y la fecha de nacimiento de cada perfil protegido, y los eventos de protección, como los intentos de entrar a sitios bloqueados (qué dominio, en qué dispositivo y cuándo). No guardamos el historial de navegación ni los sitios que no están bloqueados.",
  },
  {
    question: "¿Cómo elimino mi cuenta?",
    answer:
      "Desde Configuración > Eliminar cuenta. Te vamos a pedir tu contraseña para confirmar. Se borran tu cuenta, los perfiles de tus dispositivos, las alertas, el historial y los sitios que agregaste. No se puede deshacer.",
  },
];

function FaqCard({ faq, expanded, onToggle }: { faq: Faq; expanded: boolean; onToggle: () => void }) {
  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <Pressable
        onPress={onToggle}
        style={styles.cardHeader}
        accessibilityRole="button"
        accessibilityLabel={faq.question}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.question}>{faq.question}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
      </Pressable>
      {expanded ? <Text style={styles.answer}>{faq.answer}</Text> : null}
    </View>
  );
}

export default function AyudaScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Ayuda y preguntas frecuentes" />

        <Text style={styles.intro}>
          Acá respondemos las dudas más comunes sobre cómo funciona BA Protege+. Tocá una pregunta
          para ver la respuesta.
        </Text>

        <View style={styles.list}>
          {FAQS.map((faq, index) => (
            <FaqCard
              key={faq.question}
              faq={faq}
              expanded={openIndex === index}
              onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textMuted} />
          <Text style={styles.footerText}>
            ¿No encontraste lo que buscabas? Contanos tu duda desde Configuración {">"} Ayudanos a
            mejorar.
          </Text>
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
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardExpanded: {
    borderColor: colors.brand,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  question: {
    flex: 1,
    ...typography.label,
    fontSize: 15,
  },
  answer: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  footerText: {
    flex: 1,
    ...typography.body,
  },
});
