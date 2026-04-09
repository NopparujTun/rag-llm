import { SessionInsightsScreen } from "@/components/SessionInsightsScreen";
import { useRouter } from "expo-router";
import React, { useState, useCallback } from "react";
import { ScrollView, RefreshControl } from "react-native";

export default function SessionInsightsPage() {
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <SessionInsightsScreen
        flashcards={[]}
        results={[]}
        onDone={() => router.navigate("/")}
      />
    </ScrollView>
  );
}
