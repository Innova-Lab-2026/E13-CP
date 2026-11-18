// Nombre con el que se registra cada peso de Inter en Android (src/fonts.ts) y
// cuál corresponde a cada `fontWeight`. Sin dependencias de React Native.

export const INTER_WEIGHT_FAMILIES = {
  400: "Inter_400Regular",
  500: "Inter_500Medium",
  600: "Inter_600SemiBold",
  700: "Inter_700Bold",
  800: "Inter_800ExtraBold",
  900: "Inter_900Black",
} as const;

type InterWeight = keyof typeof INTER_WEIGHT_FAMILIES;

const WEIGHTS: InterWeight[] = [400, 500, 600, 700, 800, 900];

/**
 * Familia de Inter para un `fontWeight` de React Native ("700", 600, "bold"...).
 * Los pesos que no se cargan (100 a 300) usan la regular; los intermedios, el
 * más cercano.
 */
export function interFamilyForWeight(weight: string | number | undefined | null): string {
  let numeric: number;
  if (weight === "bold") numeric = 700;
  else if (weight === undefined || weight === null || weight === "normal") numeric = 400;
  else numeric = Number(weight);
  if (!Number.isFinite(numeric) || numeric < 400) numeric = 400;

  const closest = WEIGHTS.reduce((best, candidate) =>
    Math.abs(candidate - numeric) < Math.abs(best - numeric) ? candidate : best,
  );
  return INTER_WEIGHT_FAMILIES[closest];
}
