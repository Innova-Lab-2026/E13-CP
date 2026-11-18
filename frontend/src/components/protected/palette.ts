import { colors } from "../../theme";

/**
 * Colores de las pantallas del celular protegido tomados del Figma
 * ("Dasboard dispositivo protegido", "Menú navegación - Protegido" y las cuatro
 * pantallas de consejos). Son los tonos lima, ámbar y rosa de las tarjetas;
 * el resto sale de los tokens del theme.
 *
 * Los colores de ícono y de texto están oscurecidos respecto del Figma para que
 * tengan contraste suficiente sobre los fondos claros (3:1 para íconos, 4,5:1
 * para texto).
 */
export const protectedColors = {
  /** Fondo de la tarjeta grande "Protección activa" y de la tarjeta "Recordá" verde. */
  greenCard: "#E7F8D2",
  /** Círculo detrás del escudo y de los íconos verdes. */
  greenCircle: "#D2F2A9",
  /** Íconos verdes (escudo, candado, check). */
  greenIcon: "#3F7F0E",

  /** Tarjeta "Protección pausada" y "Recordá" ámbar. */
  amberCard: "#FFF3D1",
  amberCircle: "#FBE2AE",
  amberIcon: "#A15C00",

  /** Tarjeta "Recordá" rosa y círculo de "Preguntas frecuentes". */
  pinkCard: "#FDE3EC",
  pinkCircle: "#FBCFE1",
  pinkIcon: "#B42A6E",

  /** Círculo gris de los pasos numerados y de las filas de Configuración. */
  grayCircle: "#D5D9DC",
  grayIcon: colors.text,

  /** Borde y sombra de las tarjetas de una línea (más marcados que en el resto de la app). */
  cardBorder: colors.borderStrong,
} as const;

export type ProtectedTone = "green" | "amber" | "pink" | "gray";

/** Fondo del círculo y color del ícono de cada tono. */
export function toneColors(tone: ProtectedTone): { circle: string; icon: string; card: string } {
  switch (tone) {
    case "green":
      return {
        circle: protectedColors.greenCircle,
        icon: protectedColors.greenIcon,
        card: protectedColors.greenCard,
      };
    case "amber":
      return {
        circle: protectedColors.amberCircle,
        icon: protectedColors.amberIcon,
        card: protectedColors.amberCard,
      };
    case "pink":
      return {
        circle: protectedColors.pinkCircle,
        icon: protectedColors.pinkIcon,
        card: protectedColors.pinkCard,
      };
    default:
      return {
        circle: protectedColors.grayCircle,
        icon: protectedColors.grayIcon,
        card: colors.surface,
      };
  }
}
