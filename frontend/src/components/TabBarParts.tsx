// Partes de la barra de pestañas (Figma): la pestaña activa lleva una píldora
// amarilla detrás del ícono negro y la etiqueta en negrita; las demás, ícono gris
// y etiqueta regular. La comparten la app del adulto y la del celular protegido.
// El amarillo de marca sobre fondo claro no tiene contraste suficiente como
// color de texto o de ícono: por eso va de fondo.
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { EdgeInsets } from "react-native-safe-area-context";
import { Text } from "./ThemedText";
import { colors, radius, spacing } from "../theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type McIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type TabIconProps =
  | { focused: boolean; active: IoniconName; inactive: IoniconName; family?: "ionicons" }
  | { focused: boolean; active: McIconName; inactive: McIconName; family: "material" };

export function TabIcon(props: TabIconProps) {
  const color = props.focused ? colors.text : colors.textMuted;
  return (
    <View style={[styles.iconPill, props.focused && styles.iconPillActive]}>
      {props.family === "material" ? (
        <MaterialCommunityIcons name={props.focused ? props.active : props.inactive} size={22} color={color} />
      ) : (
        <Ionicons name={props.focused ? props.active : props.inactive} size={22} color={color} />
      )}
    </View>
  );
}

/** Etiqueta con Inter: negrita solo en la pestaña activa. */
export function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  return (
    <Text
      style={[styles.label, { color: focused ? colors.text : colors.textMuted, fontWeight: focused ? "700" : "400" }]}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

/** Estilo común de la barra; la altura suma el inset inferior (barra de gestos). */
export function tabBarStyle(insets: EdgeInsets) {
  return {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    // Ícono en píldora (30) + etiqueta + paddings: con 64 la etiqueta quedaba cortada.
    height: 74 + insets.bottom,
    paddingTop: spacing.sm,
    paddingBottom: Math.max(insets.bottom, spacing.sm),
  };
}

const styles = StyleSheet.create({
  iconPill: {
    minWidth: 52,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: colors.brand,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
});
