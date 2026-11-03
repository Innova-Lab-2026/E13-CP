import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export type HistoryCategory = "all" | "blocked" | "security" | "settings";

type HistoryFiltersProps = {
  selectedCategory: HistoryCategory;
  onCategoryChange: (category: HistoryCategory) => void;
  users: string[];
  selectedUser: string;
  onUserChange: (user: string) => void;
};

const categories: { label: string; value: HistoryCategory }[] = [
  { label: "Todos", value: "all" },
  { label: "Bloqueos", value: "blocked" },
  { label: "Seguridad", value: "security" },
  { label: "Configuración", value: "settings" },
];

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

function FilterChip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filter,
        selected && styles.filterSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected, selected }}
      hitSlop={{ top: 4, bottom: 4 }}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function HistoryFilters({
  selectedCategory,
  onCategoryChange,
  users,
  selectedUser,
  onUserChange,
}: HistoryFiltersProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Filtrar por categoría</Text>

      <View style={styles.filters} accessibilityRole="radiogroup">
        {categories.map((category) => (
          <FilterChip
            key={category.value}
            label={category.label}
            selected={selectedCategory === category.value}
            onPress={() => onCategoryChange(category.value)}
            accessibilityLabel={`Categoría ${category.label}`}
          />
        ))}
      </View>

      <Text style={[styles.heading, styles.userHeading]}>
        Filtrar por usuario
      </Text>
      <View style={styles.filters} accessibilityRole="radiogroup">
        <FilterChip
          label="Todos"
          selected={selectedUser === "all"}
          onPress={() => onUserChange("all")}
          accessibilityLabel="Todos los usuarios"
        />
        {users.map((user) => (
          <FilterChip
            key={user}
            label={user}
            selected={selectedUser === user}
            onPress={() => onUserChange(user)}
            accessibilityLabel={`Usuario ${user}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm + 2,
  },
  userHeading: {
    marginTop: spacing.lg,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filter: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brandPressed,
  },
  pressed: {
    opacity: 0.8,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  filterTextSelected: {
    color: colors.onBrand,
    fontWeight: "700",
  },
});
