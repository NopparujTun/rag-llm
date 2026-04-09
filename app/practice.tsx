import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AIAssistantScreen } from "../components/AIAssistantScreen";
import { FlashcardPracticeScreen } from "../components/FlashcardPracticeScreen";
import type { FlashcardData } from "../components/types";
import { api } from "../lib/api";

export default function PracticeRoute() {
  // Normalize the parameter since Expo Router can occasionally return params as string arrays
  const params = useLocalSearchParams();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;
  const router = useRouter();

  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFlashcards = async () => {
    try {
      let targetSessionId = sessionId;

      if (!targetSessionId) {
        // Fallback: If navigating directly to /practice, load the most recent session
        const sessions = await api.getSessionsList();
        if (sessions && sessions.length > 0) {
          targetSessionId = sessions[0].id;
        } else {
          setError("No session ID provided and no recent sessions found.");
          setLoading(false);
          return;
        }
      }

      const data = await api.getSessionFlashcards(targetSessionId);
      // Safely extract flashcards based on how your backend nests them
      const fetchedCards = data.flashcards || data || [];

      // Enforce fallback properties mapping against your FlashcardData type
      const formattedCards = fetchedCards.map((card: any) => ({
        ...card,
        skills: card.skills || [],
        difficulty: card.difficulty || "Medium",
        category: card.category || "General",
      }));

      setFlashcards(formattedCards);
    } catch (err: any) {
      setError(err.message || "Failed to load flashcards.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFlashcards().finally(() => setRefreshing(false));
  }, [sessionId]);

  useEffect(() => {
    fetchFlashcards();
  }, [sessionId]);

  const handleCardAction = async (action: "known" | "review") => {
    const currentCard = flashcards[currentIndex];

    try {
      await api.updateFlashcardStatus(currentCard.id, action);
    } catch (err) {
      console.error("Failed to update status:", err);
    }

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Session complete logic - redirect to an Insights screen or back home
      router.back();
    }
  };

  if (aiQuestion !== null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <AIAssistantScreen
          cardQuestion={aiQuestion}
          onBack={() => setAiQuestion(null)}
        />
      </>
    );
  }

  let content = null;
  if (loading) {
    content = (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F3F4F6",
        }}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>
          Loading your flashcards...
        </Text>
      </SafeAreaView>
    );
  } else if (error) {
    content = (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F3F4F6",
        }}
      >
        <Text style={{ color: "#DC2626" }}>{error}</Text>
      </SafeAreaView>
    );
  } else {
    content = (
      <FlashcardPracticeScreen
        flashcards={flashcards}
        currentIndex={currentIndex}
        onCardAction={handleCardAction}
        onOpenAI={(question) => setAiQuestion(question)}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {content}
      </ScrollView>
    </>
  );
}
