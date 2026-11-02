// Tokens visuales de BA Protege+ tomados del UI Kit de Figma ("BA Protege+ / UI Kit · Android · Light").
// Usar siempre estos valores en lugar de colores sueltos para que todas las pantallas se vean iguales.

export const colors = {
  brand: "#FFD500",
  brandPressed: "#F2C900",
  brandSoft: "#FFF6C2",
  background: "#FFFFFF",
  backgroundWarm: "#FFFDF2",
  surface: "#FFFFF5",
  surfaceMuted: "#F7F7F2",
  border: "#E5E5D8",
  borderStrong: "#CFCFC2",
  text: "#1C1C1C",
  textMuted: "#686868",
  textSubtle: "#8A8A80",
  onBrand: "#1C1C1C",
  onDanger: "#FFFFFF",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  successText: "#166534",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  warningText: "#92400E",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  dangerText: "#991B1B",
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
