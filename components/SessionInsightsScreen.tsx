import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FlashcardData, SessionResult } from "./types";

interface SessionInsightsScreenProps {
  flashcards: FlashcardData[];
  results: SessionResult[];
  onDone: () => void;
}

export function SessionInsightsScreen({
  flashcards,
  results,
  onDone,
}: SessionInsightsScreenProps) {
  const knownCount = results.filter((r) => r.action === "known").length;
  const reviewCount = results.filter((r) => r.action === "review").length;
  const total = results.length;
  const accuracy = total > 0 ? Math.round((knownCount / total) * 100) : 0;

  // Collect all unique skills from completed cards
  const allSkills = Array.from(new Set(flashcards.flatMap((c) => c.skills)));

  // Collect categories
  const categories = Array.from(new Set(flashcards.map((c) => c.category)));

  const getAccuracyColor = () => {
    if (accuracy >= 80) return "#059669";
    if (accuracy >= 60) return "#D97706";
    return "#DC2626";
  };
  const getAccuracyBg = () => {
    if (accuracy >= 80) return "#ECFDF5";
    if (accuracy >= 60) return "#FFFBEB";
    return "#FEF2F2";
  };
  const getAccuracyLabel = () => {
    if (accuracy >= 80) return "Excellent! Ready for interviews. 🎉";
    if (accuracy >= 60) return "Good progress. Keep practicing!";
    return "Keep at it. Review and retry soon.";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.celebrationIcon}>
            <Text style={{ fontSize: 40 }}>
              {accuracy >= 80 ? "🎉" : accuracy >= 60 ? "📈" : "💪"}
            </Text>
          </View>
          <Text style={styles.title}>Session Complete!</Text>
          <Text style={styles.subtitle}>Here's how you performed</Text>
        </View>

        {/* Accuracy Ring Card */}
        <View
          style={[styles.accuracyCard, { backgroundColor: getAccuracyBg() }]}
        >
          <View style={styles.accuracyRing}>
            <Text
              style={[styles.accuracyNumber, { color: getAccuracyColor() }]}
            >
              {accuracy}%
            </Text>
            <Text style={styles.accuracyLabel}>Known</Text>
          </View>
          <Text style={[styles.accuracyTagline, { color: getAccuracyColor() }]}>
            {getAccuracyLabel()}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardKnown]}>
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
            <Text style={[styles.statNum, { color: "#059669" }]}>
              {knownCount}
            </Text>
            <Text style={styles.statLbl}>Known</Text>
          </View>
          <View style={[styles.statCard, styles.statCardReview]}>
            <Ionicons name="refresh-circle" size={24} color="#DC2626" />
            <Text style={[styles.statNum, { color: "#DC2626" }]}>
              {reviewCount}
            </Text>
            <Text style={styles.statLbl}>To Review</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="layers-outline" size={24} color="#4F46E5" />
            <Text style={[styles.statNum, { color: "#4F46E5" }]}>{total}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
        </View>

        {/* Skills Covered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills Covered</Text>
          <View style={styles.skillsWrap}>
            {allSkills.map((skill) => (
              <View key={skill} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topics Reviewed</Text>
          {categories.map((cat) => {
            const catCards = flashcards.filter((c) => c.category === cat);
            const catKnown = catCards.filter((c) =>
              results.find((r) => r.cardId === c.id && r.action === "known"),
            );
            const catPct =
              catCards.length > 0
                ? Math.round((catKnown.length / catCards.length) * 100)
                : 0;
            return (
              <View key={cat} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryName}>{cat}</Text>
                  <Text style={styles.categoryCount}>
                    {catCards.length} cards
                  </Text>
                </View>
                <View style={styles.categoryBarBg}>
                  <View
                    style={[styles.categoryBarFill, { width: `${catPct}%` }]}
                  />
                </View>
                <Text style={styles.categoryPct}>{catPct}%</Text>
              </View>
            );
          })}
        </View>

        {/* CTA Buttons */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={onDone}
          activeOpacity={0.85}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onDone}
          activeOpacity={0.85}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color="#4F46E5"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.retryBtnText}>Retry Session</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 24 },

  hero: { alignItems: "center", marginBottom: 28, marginTop: 16 },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 4 },

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
  statCardKnown: { borderColor: "#A7F3D0" },
  statCardReview: { borderColor: "#FECACA" },
  statNum: { fontSize: 28, fontWeight: "800", marginVertical: 4 },
  statLbl: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },

  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  skillTagText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  categoryLeft: { width: 100 },
  categoryName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  categoryCount: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  categoryBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  },
  categoryBarFill: { height: 6, backgroundColor: "#4F46E5", borderRadius: 3 },
  categoryPct: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
    width: 36,
    textAlign: "right",
  },

  doneBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  retryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    backgroundColor: "#FAFBFF",
  },
  retryBtnText: { color: "#4F46E5", fontSize: 16, fontWeight: "600" },
});
