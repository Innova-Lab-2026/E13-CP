// Tipografía Inter (Figma).
// - Web: los pesos que usa la app se cargan bajo una sola familia "Inter" y
//   `fontWeight` elige la variante.
// - Android: además, cada peso se registra con su propio nombre
//   ("Inter_700Bold"...), que es lo que usa ThemedText según el `fontWeight`.
import { Platform } from "react-native";
import { FontDisplay, type FontFamilyDefinition } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Inter_900Black } from "@expo-google-fonts/inter/900Black";
import { FONT_FAMILY } from "./theme";
import { INTER_WEIGHT_FAMILIES } from "./fontWeights";

const face = (path: number, weight: number) => ({
  path,
  weight,
  style: "normal" as const,
  // En la web se muestra el texto con la fuente del sistema mientras Inter descarga.
  display: FontDisplay.SWAP,
});

const FACES: [number, keyof typeof INTER_WEIGHT_FAMILIES][] = [
  [Inter_400Regular, 400],
  [Inter_500Medium, 500],
  [Inter_600SemiBold, 600],
  [Inter_700Bold, 700],
  [Inter_800ExtraBold, 800],
  [Inter_900Black, 900],
];

const SINGLE_FAMILY: FontFamilyDefinition = {
  fontFamily: FONT_FAMILY,
  fontDefinitions: FACES.map(([path, weight]) => face(path, weight)),
};

/** En Android, una familia por peso, con una sola variante cada una. */
const PER_WEIGHT: FontFamilyDefinition[] = FACES.map(([path, weight]) => ({
  fontFamily: INTER_WEIGHT_FAMILIES[weight],
  fontDefinitions: [face(path, weight)],
}));

export const INTER_FONTS: FontFamilyDefinition[] =
  Platform.OS === "web" ? [SINGLE_FAMILY] : [SINGLE_FAMILY, ...PER_WEIGHT];
