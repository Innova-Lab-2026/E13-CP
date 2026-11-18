import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../src/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import InfoCard from "../../src/components/protected/InfoCard";
import ProtectedScreenHeader from "../../src/components/protected/ProtectedScreenHeader";
import { protectedColors } from "../../src/components/protected/palette";
import { colors, radius, shadow, spacing } from "../../src/theme";

/** Preguntas y respuestas sobre lo que hace la app en este celular. */
const FAQ: readonly { question: string; answer: string }[] = [
  {
    question: "¿Qué bloquea BA Protege+?",
    answer:
      "Los sitios del listado oficial de sitios de apuestas online de LOTBA (Lotería de la Ciudad de Buenos Aires) y los que haya agregado la persona adulta que te acompaña. El resto de internet funciona como siempre.",
  },
  {
    question: "¿Por qué se bloquean estos sitios?",
    answer:
      "Las apuestas online pueden enganchar rápido y traer problemas de plata y de ánimo. La persona adulta activó la protección para acompañarte, no para castigarte: si te aparece un sitio bloqueado, no hiciste nada malo.",
  },
  {
    question: "¿BA Protege+ ve lo que hago en el celular?",
    answer:
      "No. No lee tus mensajes, tus fotos ni tu ubicación, y no guarda lo que navegás. Solo compara los sitios con la lista de bloqueo. La persona adulta recibe avisos sobre la protección, por ejemplo si alguien intenta pausarla o quitarla, o si desde la app se prueba un sitio que está bloqueado.",
  },
  {
    question: "¿Qué hago si se bloquea un sitio que no es de apuestas?",
    answer:
      "Contáselo a la persona adulta. Si el sitio lo agregó ella, lo puede quitar desde su celular. Si es parte del listado oficial, la lista la define LOTBA. Desde Configuración podés probar si un sitio está en la lista.",
  },
  {
    question: "¿Puedo pausar o quitar la protección?",
    answer:
      "Para pausarla o salir del modo protegido hace falta el PIN de la persona adulta. Si se ingresa un PIN incorrecto, a ella le llega un aviso.",
  },
  {
    question: "¿Con quién puedo hablar si algo me preocupa?",
    answer:
      "Con alguien de confianza: tu familia, un docente o la persona adulta que te acompaña. No hay preguntas malas y contarlo es la mejor forma de encontrar una solución.",
  },
];

/** Preguntas frecuentes del celular protegido (desde el Inicio y desde Configuración). */
export default function ProtectedFaqScreen() {
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/protected");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProtectedScreenHeader
          title="Preguntas frecuentes"
          subtitle="Encontrá respuesta a tus dudas."
          onBack={goBack}
        />

        <View style={styles.list}>
          {FAQ.map((item) => (
            <View key={item.question} style={styles.card}>
              <Text style={styles.question} accessibilityRole="header">
                {item.question}
              </Text>
              <Text style={styles.answer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        <View style={styles.talk}>
          <InfoCard
            title="Hablá con alguien"
            description="Si algo te incomoda, podés contarlo."
            icon="people-outline"
            tone="pink"
            onPress={() =>
              router.navigate({
                pathname: "/protected/navegacion/[tema]",
                params: { tema: "hablar" },
              })
            }
          />
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
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: protectedColors.cardBorder,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  question: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  talk: {
    marginTop: spacing.xxl,
  },
});
