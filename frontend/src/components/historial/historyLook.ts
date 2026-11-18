// Colores e íconos de cada tipo de evento (Figma "Historial" / "Alertas").
import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme";

export type HistoryVariant =
  /** Sitio bloqueado: rojo con círculo tachado. */
  | "blocked"
  /** ¡Requiere tu atención! (desinstalación o evasión): rojo con octógono. */
  | "attention"
  /** Intento de modificación: ámbar. */
  | "alert"
  /** Configuración actualizada, perfil creado: gris. */
  | "settings"
  /** Protección activada: verde. */
  | "protected";

export type HistoryIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type HistoryLook = {
  icon: HistoryIconName;
  iconColor: string;
  iconBackground: string;
  /** Color del título de la tarjeta y del detalle (con contraste sobre fondo claro). */
  titleColor: string;
};

export const HISTORY_LOOKS: Record<HistoryVariant, HistoryLook> = {
  blocked: {
    icon: "cancel",
    iconColor: colors.danger,
    iconBackground: colors.dangerStrongSoft,
    titleColor: colors.danger,
  },
  attention: {
    icon: "alert-octagon-outline",
    iconColor: colors.danger,
    iconBackground: colors.dangerStrongSoft,
    titleColor: colors.danger,
  },
  // Figma "Alertas" y "Detalle por dispositivo": octógono ámbar.
  alert: {
    icon: "alert-octagon-outline",
    iconColor: colors.warning,
    iconBackground: colors.warningSoft,
    titleColor: colors.warningText,
  },
  settings: {
    icon: "cog",
    iconColor: colors.slate,
    iconBackground: colors.neutralSoft,
    titleColor: colors.slate,
  },
  protected: {
    icon: "shield-outline",
    iconColor: colors.success,
    iconBackground: colors.successStrongSoft,
    titleColor: colors.successText,
  },
};

export function historyLook(variant: HistoryVariant | undefined): HistoryLook {
  return (variant && HISTORY_LOOKS[variant]) || HISTORY_LOOKS.settings;
}

/**
 * Variante visual de una alerta a partir de su `type` ("danger", "blocked",
 * "warning", "info") y del tipo del backend, para que alertas e historial se vean igual.
 */
export function alertVariant(type: string, alertType?: string): HistoryVariant {
  switch (type) {
    case "danger":
      return "attention";
    case "blocked":
      return "blocked";
    case "warning":
      return "alert";
    default:
      return alertType === "DEVICE_LINKED" ? "protected" : "settings";
  }
}

/** Estado que se muestra en el detalle del evento. */
export const STATUS_BY_VARIANT: Record<HistoryVariant, { label: string; icon: HistoryIconName }> = {
  blocked: { label: "Acceso bloqueado", icon: "cancel" },
  attention: { label: "Requiere tu atención", icon: "alert-octagon-outline" },
  alert: { label: "Revisá esta actividad", icon: "alert-circle-outline" },
  settings: { label: "Cambio registrado", icon: "information-outline" },
  protected: { label: "Protección activa", icon: "shield-check-outline" },
};
