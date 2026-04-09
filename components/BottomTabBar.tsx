import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Screen } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BottomTabBarProps {
  currentScreen: Screen;
}

// ─── Tab Configuration ────────────────────────────────────────────────────────

interface TabConfig {
  id: Screen;
  label: string;
  /** Ionicons name when this tab is active. */
  activeIcon: React.ComponentProps<typeof Ionicons>["name"];
  /** Ionicons name when this tab is inactive. */
  inactiveIcon: React.ComponentProps<typeof Ionicons>["name"];
}

const TABS: TabConfig[] = [
  {
    id: "home",
    label: "Home",
    activeIcon: "home",
    inactiveIcon: "home-outline",
  },
  {
    id: "library",
    label: "Library",
    activeIcon: "albums",
    inactiveIcon: "albums-outline",
  },
  {
    id: "insights",
    label: "Insights",
    activeIcon: "analytics",
    inactiveIcon: "analytics-outline",
  },
  {
    id: "profile",
    label: "Profile",
    activeIcon: "person",
    inactiveIcon: "person-outline",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BottomTabBar({ currentScreen }: BottomTabBarProps) {
  const router = useRouter();

  const handleNavigate = (id: Screen) => {
    if (id === "home") {
      router.replace("/");
    } else {
      router.replace(`/(tabs)/${id}` as any);
    }
  };

  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = currentScreen === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => handleNavigate(tab.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.inactiveIcon}
              size={22}
              color={isActive ? "#4F46E5" : "#6B7280"}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#4F46E5",
    fontWeight: "700",
  },
});
