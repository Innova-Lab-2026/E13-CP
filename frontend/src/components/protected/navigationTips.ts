import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { ProtectedTone } from "./palette";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type TipTopicId = "datos" | "enganos" | "hablar" | "que-hace";

export type TipTopic = {
  id: TipTopicId;
  /** Título de la tarjeta en "Navegá seguro" y de la pantalla del consejo. */
  title: string;
  /** Descripción corta de la tarjeta en "Navegá seguro". */
  summary: string;
  icon: IconName;
  tone: ProtectedTone;
  /** Párrafo debajo del título de la pantalla. */
  intro: string;
  steps: { title: string; text: string }[];
  /** Tarjeta "Recordá" del final, con el color del tema. */
  reminder: string;
};

/**
 * Contenido de "Navegá seguro" y de sus cuatro pantallas, tomado del Figma del
 * celular protegido con voseo y ortografía corregidos. "¿Qué hace BA Protege+?"
 * describe lo que la app hace de verdad: bloquea el listado oficial de sitios de
 * apuestas online de LOTBA y no lee mensajes, fotos ni ubicación.
 */
export const TIP_TOPICS: readonly TipTopic[] = [
  {
    id: "datos",
    title: "Protegé tus datos",
    summary: "Tu información personal es valiosa.",
    icon: "lock-closed-outline",
    tone: "green",
    intro: "Tu información personal es valiosa. Cuidala para mantenerte seguro en internet.",
    steps: [
      {
        title: "Usá contraseñas seguras",
        text: "No las compartas con amigos ni en redes sociales. Usá combinaciones difíciles de adivinar.",
      },
      {
        title: "Evitá compartir datos personales",
        text: "Como tu dirección, tu escuela, tu número de teléfono o tus fotos.",
      },
      {
        title: "Usá redes seguras",
        text: "Evitá conectarte a redes wifi públicas para acceder a tus cuentas.",
      },
    ],
    reminder: "Tu información también te protege. Pensá antes de compartirla.",
  },
  {
    id: "enganos",
    title: "Cuidado con los engaños",
    summary: "Aprendé a identificar situaciones de riesgo.",
    icon: "alert-circle-outline",
    tone: "amber",
    intro: "Aprendé a reconocer las trampas más comunes para no caer en ellas.",
    steps: [
      {
        title: "Desconfiá de ofertas increíbles",
        text: "Si algo parece demasiado bueno para ser verdad, probablemente no lo sea.",
      },
      {
        title: "Revisá los enlaces",
        text: "Antes de hacer clic, fijate que la dirección sea correcta y confiable.",
      },
      {
        title: "No compartas códigos",
        text: "Nunca compartas códigos de verificación ni datos de tus cuentas.",
      },
    ],
    reminder: "Si algo te genera dudas, frená y pensá antes de hacer clic.",
  },
  {
    id: "hablar",
    title: "Hablá con alguien",
    summary: "Si algo te incomoda, podés contarlo.",
    icon: "people-outline",
    tone: "pink",
    intro:
      "Si algo en internet te incomoda o te genera dudas, es importante que se lo cuentes a alguien de confianza.",
    steps: [
      {
        title: "Podés hablar con un familiar",
        text: "Una persona adulta de confianza puede escucharte y ayudarte.",
      },
      {
        title: "Podés hablar con un docente",
        text: "Si vas a la escuela, siempre hay personas que pueden orientarte.",
      },
      {
        title: "No estás solo ni sola",
        text: "Si algo te preocupa, contarlo es la mejor forma de encontrar una solución.",
      },
    ],
    reminder: "No hay preguntas malas. Si algo te preocupa, es mejor hablarlo.",
  },
  {
    id: "que-hace",
    title: "¿Qué hace BA Protege+?",
    summary: "Conocé cómo te ayudamos a navegar más seguro.",
    icon: "shield-checkmark-outline",
    tone: "green",
    intro: "Te ayudamos a mantener tu dispositivo protegido frente a los sitios de apuestas online.",
    steps: [
      {
        title: "Bloqueamos sitios de apuestas",
        text: "Evitamos el acceso a los sitios del listado oficial de apuestas online de LOTBA.",
      },
      {
        title: "Mantenemos la lista actualizada",
        text: "La app descarga la versión más reciente del listado y suma los sitios que agregue la persona adulta.",
      },
      {
        title: "Cuidamos tu privacidad",
        text: "No leemos tus mensajes, tus fotos ni tu ubicación. El resto de internet funciona como siempre.",
      },
    ],
    reminder: "La protección funciona en segundo plano para que no tengas que preocuparte.",
  },
];

export function findTipTopic(id: string | undefined): TipTopic | undefined {
  return TIP_TOPICS.find((topic) => topic.id === id);
}
