// Filtros del historial (Figma "Historial"): fila de pestañas píldora con scroll
// horizontal "Todos / Por categorías / Por dispositivo" y, para las dos últimas,
// una segunda fila de chips para elegir la categoría o el perfil.
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { HistoryCategory as EventCategory } from "../../services/historyService";

/** Categoría elegida; "all" se mantiene por compatibilidad. */
export type HistoryCategory = "all" | EventCategory;

export type HistoryTab = "all" | "category" | "device";

export type HistoryDeviceOption = { id: string; name: string };

export const HISTORY_CATEGORIES: { label: string; value: EventCategory }[] = [
  { label: "Sitios bloqueados", value: "blocked" },
  { label: "Seguridad", value: "security" },
  { label: "Configuración", value: "settings" },
];

const TABS: { label: string; value: HistoryTab }[] = [
  { label: "Todos", value: "all" },
  { label: "Por categorías", value: "category" },
  { label: "Por dispositivo", value: "device" },
];

type HistoryFiltersProps = {
  tab: HistoryTab;
  onTabChange: (tab: HistoryTab) => void;
  category: EventCategory;
  onCategoryChange: (category: EventCategory) => void;
  devices: HistoryDeviceOption[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
};

export default function HistoryFilters({
  tab,
  onTabChange,
  category,
  onCategoryChange,
  devices,
  selectedDeviceId,
  onDeviceChange,
}: HistoryFiltersProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        {TABS.map((item) => {
          const selected = tab === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => onTabChange(item.value)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              hitSlop={{ top: 6, bottom: 6 }}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === "category" ? (
        <ChipRow
          label="Categoría"
          options={HISTORY_CATEGORIES.map((item) => ({ id: item.value, name: item.label }))}
          selectedId={category}
          onSelect={(id) => onCategoryChange(id as EventCategory)}
        />
      ) : null}

      {tab === "device" ? (
        devices.length > 0 ? (
          <ChipRow
            label="Dispositivo"
            options={devices}
            selectedId={selectedDeviceId}
            onSelect={onDeviceChange}
          />
        ) : (
          <Text style={styles.hint}>Todavía no agregaste dispositivos.</Text>
        )
      ) : null}
    </View>
  );
}

function ChipRow({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: HistoryDeviceOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.bleed, styles.chipScroll]}
      contentContainerStyle={[styles.row, styles.chipRow]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityLabel={`${label} ${option.name}`}
            accessibilityState={{ checked: selected, selected }}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  // Las filas llegan hasta el borde de la pantalla para que se note el scroll.
  bleed: {
    marginHorizontal: -spacing.xl,
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  tab: {
    minWidth: 92,
    height: 34,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  tabSelected: {
    backgroundColor: colors.brand,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  tabTextSelected: {
    fontWeight: "700",
    color: colors.onBrand,
  },
  chipScroll: {
    marginTop: spacing.md,
  },
  chipRow: {
    gap: spacing.sm,
  },
  chip: {
    height: 32,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  chipSelected: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.text,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
  },
  chipTextSelected: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
});
