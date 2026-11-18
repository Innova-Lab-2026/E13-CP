// Tipografía Inter (Figma). Se cargan los pesos que usa la app bajo una sola
// familia "Inter", así `fontWeight` elige la variante en web y en Android.
import { FontDisplay, type FontFamilyDefinition } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Inter_900Black } from "@expo-google-fonts/inter/900Black";
import { FONT_FAMILY } from "./theme";

const face = (path: number, weight: number) => ({
  path,
  weight,
  style: "normal" as const,
  // En la web se muestra el texto con la fuente del sistema mientras Inter descarga.
  display: FontDisplay.SWAP,
});

export const INTER_FONTS: FontFamilyDefinition[] = [
  {
    fontFamily: FONT_FAMILY,
    fontDefinitions: [
      face(Inter_400Regular, 400),
      face(Inter_500Medium, 500),
      face(Inter_600SemiBold, 600),
      face(Inter_700Bold, 700),
      face(Inter_800ExtraBold, 800),
      face(Inter_900Black, 900),
    ],
  },
];
