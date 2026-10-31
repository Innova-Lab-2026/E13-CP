
import { View, Text, Pressable, StyleSheet } from "react-native";

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

      <View style={styles.filters}>
        {categories.map((category) => {
          const isSelected = selectedCategory === category.value;

          return (
            <Pressable
              key={category.value}
              onPress={() => onCategoryChange(category.value)}
              style={[
                styles.filter,
                isSelected && styles.filterSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextSelected,
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.heading, styles.userHeading]}>
        Filtrar por usuario
      </Text>
      <View style={styles.filters}>
        {["Todos", ...users].map((user) => {
          const value = user === "Todos" ? "all" : user;
          const isSelected = selectedUser === value;

          return (
            <Pressable
              key={value}
              onPress={() => onUserChange(value)}
              style={[
                styles.filter,
                isSelected && styles.filterSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextSelected,
                ]}
              >
                {user}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 10,
  },
  userHeading: {
    marginTop: 16,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filter: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: "#F1F1EB",
    borderWidth: 1,
    borderColor: "#E2E2D9",
  },
  filterSelected: {
    backgroundColor: "#FFCC00",
    borderColor: "#E6B800",
  },
  filterText: {
    color: "#444444",
    fontSize: 12,
    fontWeight: "500",
  },
  filterTextSelected: {
    color: "#292400",
    fontWeight: "700",
  },
});
