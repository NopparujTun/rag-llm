import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FlashcardData } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlashcardPracticeScreenProps {
  flashcards: FlashcardData[];
  currentIndex: number;
  onCardAction: (action: "known" | "review") => void;
  onOpenAI: (question: string) => void;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Text colour for each difficulty level badge. */
const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#059669",
  Medium: "#D97706",
  Hard: "#DC2626",
};

/** Background colour for each difficulty level badge. */
const DIFFICULTY_BG: Record<string, string> = {
  Easy: "#ECFDF5",
  Medium: "#FFFBEB",
  Hard: "#FEF2F2",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Shown in place of the card when the flashcard array is empty or out of range. */
function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center" },
      ]}
    >
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color="#9CA3AF"
        style={{ marginBottom: 16 }}
      />
      <Text style={{ fontSize: 16, color: "#6B7280", marginBottom: 24 }}>
        No flashcards available.
      </Text>
      <TouchableOpacity
        onPress={onBack}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: "#4F46E5",
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
          Go Back
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

interface CardFaceProps {
  card: FlashcardData;
  opacity: Animated.AnimatedInterpolation<string | number>;
  rotation: Animated.AnimatedInterpolation<string | number>;
}

/** Front face of the card showing the interview question. */
function CardFront({ card, opacity, rotation }: CardFaceProps) {
  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ rotateY: rotation }] }]}
    >
      <View style={styles.cardLabelRow}>
        <View style={styles.cardLabelPill}>
          <Ionicons name="help-circle-outline" size={14} color="#4F46E5" />
          <Text style={styles.cardLabelText}>INTERVIEW QUESTION</Text>
        </View>
      </View>
      <Text style={styles.questionText}>{card.question}</Text>
      <View style={styles.tapHintRow}>
        <Ionicons name="swap-horizontal-outline" size={15} color="#9CA3AF" />
        <Text style={styles.tapHint}>Tap to reveal answer</Text>
      </View>
    </Animated.View>
  );
}

/** Back face of the card showing the model answer and skill tags. */
function CardBack({ card, opacity, rotation }: CardFaceProps) {
  return (
    <Animated.View
      style={[
        styles.card,
        styles.cardBack,
        { opacity, transform: [{ rotateY: rotation }] },
      ]}
    >
      <View style={styles.cardLabelRow}>
        <View style={[styles.cardLabelPill, styles.answerPill]}>
          <Ionicons name="bulb-outline" size={14} color="#059669" />
          <Text style={[styles.cardLabelText, { color: "#059669" }]}>
            BEST PRACTICE ANSWER
          </Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <Text style={styles.answerText}>{card.answer}</Text>
        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>Skills Covered</Text>
          <View style={styles.tagsRow}>
            {card.skills.map((skill) => (
              <View key={skill} style={styles.tag}>
                <Text style={styles.tagText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * FlashcardPracticeScreen renders one card at a time with a flip animation.
 * After revealing the answer, the user marks it as "Known" or "Needs Review".
 */
export function FlashcardPracticeScreen({
  flashcards,
  currentIndex,
  onCardAction,
  onOpenAI,
  onBack,
}: FlashcardPracticeScreenProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const card = flashcards[currentIndex];
  const progress = (currentIndex / flashcards.length) * 100;

  if (!card) {
    return <EmptyState onBack={onBack} />;
  }

  const flipCard = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleAction = (action: "known" | "review") => {
    // Reset flip animation before advancing to the next card.
    flipAnim.setValue(0);
    setIsFlipped(false);
    onCardAction(action);
  };

  // Interpolated animation values for front and back card faces.
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.progress}>
            Card {currentIndex + 1} of {flashcards.length}
          </Text>
          <Text style={styles.category}>{card.category}</Text>
        </View>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: DIFFICULTY_BG[card.difficulty] },
          ]}
        >
          <Text
            style={[
              styles.difficultyText,
              { color: DIFFICULTY_COLOR[card.difficulty] },
            ]}
          >
            {card.difficulty}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Flip */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={flipCard}
          style={styles.cardTouchable}
        >
          <CardFront
            card={card}
            opacity={frontOpacity}
            rotation={frontRotate}
          />
          <CardBack card={card} opacity={backOpacity} rotation={backRotate} />
        </TouchableOpacity>

        {/* Action Row — only visible after flipping */}
        {isFlipped && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.reviewBtn]}
              onPress={() => handleAction("review")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color="#991B1B"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.actionBtnText, { color: "#991B1B" }]}>
                Needs Review
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.knownBtn]}
              onPress={() => handleAction("known")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#065F46"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.actionBtnText, { color: "#065F46" }]}>
                Known
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ask AI */}
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => onOpenAI(card.question)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color="#4F46E5"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.aiBtnText}>Ask AI about this topic</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerCenter: { alignItems: "center" },
  progress: { fontSize: 15, fontWeight: "700", color: "#374151" },
  category: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  difficultyText: { fontSize: 12, fontWeight: "700" },

  progressBarBg: {
    height: 3,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 20,
  },
  progressBarFill: { height: 3, backgroundColor: "#4F46E5", borderRadius: 2 },

  scroll: { paddingHorizontal: 20 },
  cardTouchable: { height: 380, marginBottom: 20, position: "relative" },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    backfaceVisibility: "hidden",
  },
  cardBack: { backgroundColor: "#FAFBFF", borderColor: "#C7D2FE" },

  cardLabelRow: { marginBottom: 20 },
  cardLabelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  answerPill: { backgroundColor: "#ECFDF5" },
  cardLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.8,
  },

  questionText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 30,
    flex: 1,
  },
  tapHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: "auto",
    paddingTop: 16,
  },
  tapHint: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },

  answerText: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 24,
    fontWeight: "400",
  },
  tagsSection: { marginTop: 24 },
  tagsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: { fontSize: 12, color: "#4F46E5", fontWeight: "700" },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  reviewBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  knownBtn: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  actionBtnText: { fontSize: 15, fontWeight: "700" },

  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    backgroundColor: "#FAFBFF",
  },
  aiBtnText: { fontSize: 14, color: "#4F46E5", fontWeight: "600" },
});
