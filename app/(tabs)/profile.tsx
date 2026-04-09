import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabBar } from "../../components/BottomTabBar";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../lib/authService";

interface OptionItem {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_OPTIONS: OptionItem[] = [
  { icon: "person-outline", label: "Edit Username" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Renders a single tappable option row with an icon, label, and chevron. */
function OptionRow({
  icon,
  label,
  onPress,
}: OptionItem & { onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.optionRow}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <Ionicons name={icon} size={20} color="#4B5563" />
        <Text style={styles.optionText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

/** Card containing a list of OptionRows with hairline dividers between them. */
function OptionsCard({
  options,
  onOptionPress,
}: {
  options: OptionItem[];
  onOptionPress: (label: string) => void;
}) {
  return (
    <View style={styles.optionsCard}>
      {options.map((option, index) => (
        <React.Fragment key={option.label}>
          <OptionRow {...option} onPress={() => onOptionPress(option.label)} />
          {index < options.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Page() {
  const { user } = useAuth();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Safely extract names
  const displayName = user?.user_metadata?.display_name || "User";
  const userEmail = user?.email || "No email";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const handleEditUsername = () => {
    setEditNameValue(displayName);
    setEditModalVisible(true);
  };

  const handleSaveUsername = async () => {
    if (!editNameValue.trim()) return;
    try {
      setIsSavingName(true);
      await authService.updateUserMetadata({
        display_name: editNameValue.trim(),
      });
      setEditModalVisible(false);
    } catch (error) {
      console.error("Failed to update username:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>
        </View>

        {/* Account Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <OptionsCard
            options={ACCOUNT_OPTIONS}
            onOptionPress={(label) => {
              if (label === "Edit Username") handleEditUsername();
            }}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Username</Text>
            <TextInput
              style={styles.textInput}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={isSavingName}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveUsername}
                disabled={isSavingName || !editNameValue.trim()}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabBar currentScreen="profile" />
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
  scroll: { flex: 1, padding: 24 },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 32,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#4F46E5" },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: { fontSize: 14, color: "#6B7280" },

  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 48 },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  signOutText: { color: "#DC2626", fontSize: 16, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: { color: "#4B5563", fontWeight: "600" },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600" },
});
