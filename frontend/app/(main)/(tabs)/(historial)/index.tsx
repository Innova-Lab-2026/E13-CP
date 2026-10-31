
import { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../../src/components/AppHeader";
import HistoryCard from "../../../../src/components/historial/HistoryCard";
import HistoryFilters, {
  type HistoryCategory,
} from "../../../../src/components/historial/HistoryFilters";
import { getHistoryEvents } from "../../../../src/services/historyService";

export default function HistorialScreen() {
  const router = useRouter();
  const { device: routeDevice } = useLocalSearchParams<{
    device?: string | string[];
  }>();
  const selectedDevice = Array.isArray(routeDevice)
    ? routeDevice[0]
    : routeDevice;
  const [selectedCategory, setSelectedCategory] =
    useState<HistoryCategory>("all");
  const [selectedUser, setSelectedUser] = useState(selectedDevice ?? "all");
  const historyData = useMemo(() => getHistoryEvents(), []);
  const users = useMemo(
    () => [...new Set(historyData.map((event) => event.device))].sort(),
    [historyData],
  );

  const filteredEvents = useMemo(() => {
    return historyData.filter(
      (event) =>
        (selectedCategory === "all" ||
          event.category === selectedCategory) &&
        (selectedUser === "all" || event.device === selectedUser),
    );
  }, [historyData, selectedCategory, selectedUser]);

  const todayEvents = filteredEvents.filter(
    (event) => event.date === "Hoy"
  );

  const yesterdayEvents = filteredEvents.filter(
    (event) => event.date === "Ayer"
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Historial" onBackPress={() => router.back()} />
        <Text style={styles.subtitle}>
          Revisá la actividad reciente de tus dispositivos.
        </Text>

        <HistoryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          users={users}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
        />

        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No hay eventos para los filtros seleccionados.
            </Text>
          </View>
        ) : (
          <>
            {todayEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hoy</Text>

                {todayEvents.map((event) => (
                  <HistoryCard
                    key={event.id}
                    {...event}
                    onPress={() =>
                      router.push({
                        pathname: "/(main)/(tabs)/(historial)/[historyId]",
                        params: { historyId: event.id },
                      })
                    }
                  />
                ))}
              </View>
            )}

            {yesterdayEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ayer</Text>

                {yesterdayEvents.map((event) => (
                  <HistoryCard
                    key={event.id}
                    {...event}
                    onPress={() =>
                      router.push({
                        pathname: "/(main)/(tabs)/(historial)/[historyId]",
                        params: { historyId: event.id },
                      })
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF2",
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  subtitle: {
    fontSize: 14,
    color: "#686868",
    marginBottom: 24,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  emptyText: {
    color: "#686868",
    fontSize: 14,
    textAlign: "center",
  },
});
