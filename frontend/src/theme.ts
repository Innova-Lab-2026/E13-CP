// Tokens visuales de BA Protege+ tomados del UI Kit de Figma ("BA Protege+ / UI Kit · Android · Light").
// Usar siempre estos valores en lugar de colores sueltos para que todas las pantallas se vean iguales.
import { Platform } from "react-native";

export const colors = {
  brand: "#FFD500",
  brandPressed: "#F2C900",
  brandSoft: "#FFF6C2",
  // Fondo crema de todas las pantallas del Figma; las tarjetas usan el mismo tono
  // con borde y sombra.
  background: "#FEFFF3",
  backgroundWarm: "#FEFFF3",
  surface: "#FEFFF3",
  /** Fondo de los campos de texto (blancos en el Figma). */
  field: "#FFFFFF",
  surfaceMuted: "#F7F7EA",
  border: "#E5E5D8",
  borderStrong: "#CFCFC2",
  text: "#1C1C1C",
  textMuted: "#686868",
  textSubtle: "#8A8A80",
  /** Gris azulado de los íconos en círculo (Figma: Configuración, eventos de configuración). */
  neutralSoft: "#C5CCCE",
  /** Gris pizarra de los títulos de eventos de configuración (Figma). */
  slate: "#4B5563",
  onBrand: "#1C1C1C",
  onDanger: "#FFFFFF",
  // Verdes, rojos y ámbar del Figma. Los de texto se oscurecen un poco para que
  // se lean bien sobre el fondo crema (contraste AA).
  success: "#43A027",
  successSoft: "#E7FCCA",
  successStrongSoft: "#D1F9A2",
  successText: "#2E7D1E",
  warning: "#E9940C",
  warningSoft: "#FDF0CC",
  warningText: "#92400E",
  danger: "#E5341D",
  dangerSoft: "#FDDCCD",
  dangerStrongSoft: "#FECFBF",
  dangerText: "#B4230F",
  overlay: "rgba(28, 28, 28, 0.55)",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Familia cargada en app/_layout.tsx (src/fonts.ts). */
export const FONT_FAMILY = "Inter";

export const fonts = {
  // En la web, si Inter todavía no llegó (o falla), se ve la fuente del sistema.
  family: Platform.select({
    web: `${FONT_FAMILY}, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
    default: FONT_FAMILY,
  }),
} as const;

export const typography = {
  display: { fontSize: 27, fontWeight: "800" as const, color: colors.text },
  title: { fontSize: 20, fontWeight: "800" as const, color: colors.text },
  subtitle: { fontSize: 16, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: "600" as const, color: colors.text },
  caption: { fontSize: 12, color: colors.textSubtle },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
