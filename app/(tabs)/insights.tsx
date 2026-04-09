import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabBar } from "../../components/BottomTabBar";
import type { SessionData } from "../../components/types";
import { api } from "../../lib/api";

interface AccuracyTheme {
  color: string;
  bg: string;
  tagline: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns colour, background, and tagline for a given accuracy percentage. */
function getAccuracyTheme(accuracy: number): AccuracyTheme {
  if (accuracy >= 80) {
    return {
      color: "#059669",
      bg: "#ECFDF5",
      tagline: "Excellent overall performance!",
    };
  }
  if (accuracy >= 60) {
    return {
      color: "#D97706",
      bg: "#FFFBEB",
      tagline: "Good consistent progress.",
    };
  }
  return {
    color: "#DC2626",
    bg: "#FEF2F2",
    tagline: "Keep practicing to improve!",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * InsightsScreen shows aggregate performance statistics across all sessions:
 * average accuracy, total sessions completed, and total cards studied.
 */
export default function Page() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSessionsList();
      setSessions(data);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Progress</Text>
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ marginTop: 12, color: "#6B7280" }}>
            Loading insights...
          </Text>
        </View>
        <BottomTabBar currentScreen="insights" />
      </SafeAreaView>
    );
  }

  const totalSessions = sessions.length;
  const totalCards = sessions.reduce((sum, s) => sum + s.cardCount, 0);
  const avgAccuracy =
    totalSessions > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions,
        )
      : 0;

  const theme = getAccuracyTheme(avgAccuracy);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Progress</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overall Accuracy */}
        <View style={[styles.accuracyCard, { backgroundColor: theme.bg }]}>
          <View style={styles.accuracyRing}>
            <Text style={[styles.accuracyNumber, { color: theme.color }]}>
              {avgAccuracy}%
            </Text>
            <Text style={styles.accuracyLabel}>Avg. Accuracy</Text>
          </View>
          <Text style={[styles.accuracyTagline, { color: theme.color }]}>
            {theme.tagline}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="albums-outline" size={24} color="#4F46E5" />
            <Text style={[styles.statNum, { color: "#4F46E5" }]}>
              {totalSessions}
            </Text>
            <Text style={styles.statLbl}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="layers-outline" size={24} color="#4F46E5" />
            <Text style={[styles.statNum, { color: "#4F46E5" }]}>
              {totalCards}
            </Text>
            <Text style={styles.statLbl}>Cards Studied</Text>
          </View>
        </View>

        {/* Activity Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Overview</Text>
          <View style={styles.activityCard}>
            <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
            <Text style={styles.activityText}>
              More sessions needed to display trends.
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <BottomTabBar currentScreen="insights" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  scroll: { padding: 24, flexGrow: 1 },

  accuracyCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  accuracyRing: { marginBottom: 12 },
  accuracyNumber: {
    fontSize: 64,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -2,
  },
  accuracyLabel: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: -4,
    fontWeight: "500",
  },
  accuracyTagline: { fontSize: 15, fontWeight: "600", textAlign: "center" },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statNum: { fontSize: 28, fontWeight: "800", marginVertical: 4 },
  statLbl: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  activityText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
