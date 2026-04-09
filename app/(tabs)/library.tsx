import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabBar } from "../../components/BottomTabBar";
import type { SessionData } from "../../components/types";
import { api } from "../../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the accuracy badge colour for a given percentage value. */
function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return "#059669";
  if (accuracy >= 60) return "#D97706";
  return "#DC2626";
}

/** Returns the user-visible display name for a session.
 *  Falls back to a type-based label when no custom name is set. */
function getSessionDisplayName(session: SessionData): string {
  if (session.name) return session.name;
  return session.type === "Resume" ? "Resume Analysis" : "Job Role Config";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SessionRowProps {
  session: SessionData;
  onPress: () => void;
  onEditName: () => void;
  onDelete: () => void;
}

/** Renders a single session row with its accuracy badge, edit, and delete icons. */
function SessionRow({
  session,
  onPress,
  onEditName,
  onDelete,
}: SessionRowProps) {
  return (
    <View style={styles.sessionRowWrapper}>
      <TouchableOpacity
        style={styles.sessionRow}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <View style={styles.sessionIconWrapper}>
          <Ionicons
            name={session.type === "Resume" ? "document-text" : "briefcase"}
            size={18}
            color="#4F46E5"
          />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>
            {getSessionDisplayName(session)}
          </Text>
          <Text style={styles.sessionMeta}>
            {session.cardCount} cards • {session.date}
          </Text>
        </View>
        <View style={styles.accuracyWrapper}>
          <Text
            style={[
              styles.accuracyText,
              { color: getAccuracyColor(session.accuracy) },
            ]}
          >
            {session.accuracy}%
          </Text>
        </View>
        <TouchableOpacity onPress={onEditName} style={styles.menuBtn}>
          <Ionicons name="pencil" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

interface RenameModalProps {
  visible: boolean;
  value: string;
  isSaving: boolean;
  onChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** Modal that lets the user rename a session. */
function RenameModal({
  visible,
  value,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: RenameModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Session Name</Text>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChange}
            placeholder="Enter session name"
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={onSave}
              disabled={isSaving || !value.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface DeleteConfirmModalProps {
  visible: boolean;
  sessionName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal asking the user to confirm permanent deletion of a session. */
function DeleteConfirmModal({
  visible,
  sessionName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.deleteIconWrapper}>
            <Ionicons name="trash-outline" size={28} color="#fd0000ff" />
          </View>
          <Text style={styles.modalTitle}>Delete Session?</Text>
          <Text style={styles.deleteWarningText}>
            "{sessionName}" and all its flashcards will be permanently deleted.
            This cannot be undone.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteConfirmButton}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ff0000ff" />
              ) : (
                <Text style={styles.saveButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Rename modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionData | null>(
    null,
  );
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingSession, setDeletingSession] = useState<SessionData | null>(
    null,
  );
  const [isDeletingSession, setIsDeletingSession] = useState(false);
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

  const openRenameModal = (session: SessionData) => {
    setEditingSession(session);
    setEditNameValue(session.name || "");
    setEditModalVisible(true);
  };

  const handleSaveName = async () => {
    if (!editingSession || !editNameValue.trim()) return;
    try {
      setIsSavingName(true);
      await api.updateSessionName(editingSession.id, editNameValue.trim());
      // Optimistic update — no refetch needed
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id ? { ...s, name: editNameValue.trim() } : s,
        ),
      );
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating session name:", error);
    } finally {
      setIsSavingName(false);
      setEditingSession(null);
    }
  };

  const openDeleteModal = (session: SessionData) => {
    setDeletingSession(session);
    setDeleteModalVisible(true);
  };

  const handleDeleteSession = async () => {
    if (!deletingSession) return;
    try {
      setIsDeletingSession(true);
      await api.deleteSession(deletingSession.id);
      // Optimistic remove from list
      setSessions((prev) => prev.filter((s) => s.id !== deletingSession.id));
      setDeleteModalVisible(false);
    } catch (error) {
      console.error("Error deleting session:", error);
    } finally {
      setIsDeletingSession(false);
      setDeletingSession(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Session Library</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {sessions.length > 0 ? (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onPress={() =>
                    router.push({
                      pathname: "/practice",
                      params: { sessionId: session.id },
                    })
                  }
                  onEditName={() => openRenameModal(session)}
                  onDelete={() => openDeleteModal(session)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons
                name="albums-outline"
                size={48}
                color="#9CA3AF"
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyStateTitle}>No Sessions Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create a new session from your resume or a job description to
                get started.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/")}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Create Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <RenameModal
        visible={editModalVisible}
        value={editNameValue}
        isSaving={isSavingName}
        onChange={setEditNameValue}
        onSave={handleSaveName}
        onCancel={() => setEditModalVisible(false)}
      />

      <DeleteConfirmModal
        visible={deleteModalVisible}
        sessionName={
          deletingSession ? getSessionDisplayName(deletingSession) : ""
        }
        isDeleting={isDeletingSession}
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteModalVisible(false)}
      />

      <BottomTabBar currentScreen="library" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  scroll: { padding: 24, flexGrow: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },

  sessionList: { gap: 12 },
  sessionRowWrapper: { position: "relative" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sessionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sessionMeta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  accuracyWrapper: { marginHorizontal: 16, marginRight: 8 },
  accuracyText: { fontSize: 15, fontWeight: "700" },
  menuBtn: { padding: 8 },
  deleteBtn: { padding: 8, marginRight: -8 },

  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },

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

  deleteIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  deleteWarningText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
});
