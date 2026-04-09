import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import type { SessionData } from "../../components/types";
import { useAuth } from "../../contexts/AuthContext";
import { api, ResumeFileInput } from "../../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Steps shown sequentially in the loading overlay while AI generates cards. */
const LOADING_STEPS = [
  "Parsing content...",
  "Identifying key skills...",
  "Generating RAG questions...",
  "Applying difficulty scoring...",
  "Finalizing flashcards...",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Full-screen overlay shown while flashcards are being generated. */
function LoadingOverlay({
  loadingText,
  loadingStep,
}: {
  loadingText: string;
  loadingStep: number;
}) {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
          style={{ marginBottom: 24 }}
        />
        <Text style={styles.loadingTitle}>Generating Flashcards</Text>
        <Text style={styles.loadingStep}>{loadingText}</Text>
        <View style={styles.progressDots}>
          {LOADING_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i <= loadingStep ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.loadingHint}>
          AI analysis typically takes 10–20 seconds
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** Tappable dropzone for selecting a PDF resume from the device. */
function ResumeDropzone({
  selectedFile,
  onPress,
}: {
  selectedFile: DocumentPicker.DocumentPickerAsset | null;
  onPress: () => void;
}) {
  const fileSizeKb = selectedFile?.size
    ? (selectedFile.size / 1024).toFixed(1)
    : "Unknown";

  return (
    <TouchableOpacity
      style={[styles.dropzone, selectedFile && styles.dropzoneSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {selectedFile ? (
        <>
          <View style={styles.fileIconWrap}>
            <Ionicons name="document-text" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.fileSelectedTitle}>{selectedFile.name}</Text>
          <Text style={styles.fileSelectedSub}>
            {fileSizeKb} KB · Ready to analyze
          </Text>
          <View style={styles.changeFilePill}>
            <Text style={styles.changeFileText}>Change file</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.uploadIconWrap}>
            <Ionicons name="cloud-upload-outline" size={36} color="#9CA3AF" />
          </View>
          <Text style={styles.dropzoneTitle}>Tap to select Resume</Text>
          <Text style={styles.dropzoneSub}>PDF format · Max 10 MB</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/** Multi-line text input for pasting a job description, with character feedback. */
function JobDescriptionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const charCount = value.length;
  const showWarning = charCount > 0 && charCount < 100;
  const showReady = charCount >= 100;

  return (
    <>
      <View style={styles.textareaWrap}>
        <TextInput
          style={styles.textarea}
          multiline
          placeholder={`Paste job description here...\n\nExample: We are looking for a Senior Software Engineer...`}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChange}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{charCount} characters</Text>
      </View>

      {showWarning && (
        <View style={styles.warnBox}>
          <Ionicons name="warning-outline" size={16} color="#D97706" />
          <Text style={styles.warnText}>
            Add more detail for better flashcard quality (100+ characters
            recommended)
          </Text>
        </View>
      )}

      {showReady && (
        <View style={styles.readyBox}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.readyText}>
            Looking good! Ready to generate flashcards.
          </Text>
        </View>
      )}
    </>
  );
}

/** Displays the 3 most recent sessions, or an empty state message when empty. */
function RecentSessionsList({
  sessions,
  onSessionPress,
}: {
  sessions: SessionData[];
  onSessionPress: (sessionId: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <Text style={{ color: "#6B7280", fontSize: 14 }}>
          No recent sessions yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      {sessions.slice(0, 3).map((session) => (
        <TouchableOpacity
          key={session.id}
          style={styles.sessionRow}
          activeOpacity={0.8}
          onPress={() => onSessionPress(session.id)}
        >
          <View style={styles.sessionIconWrapper}>
            <Ionicons
              name={session.type === "Resume" ? "document-text" : "briefcase"}
              size={16}
              color="#4F46E5"
            />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>
              {session.name
                ? session.name
                : session.type === "Resume"
                  ? "Resume Analysis"
                  : "Job Role Config"}
            </Text>
            <Text style={styles.sessionMeta}>
              {session.type} • {session.date}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </TouchableOpacity>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Page() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activeTab, setActiveTab] = useState<"resume" | "job">("resume");
  const [jdText, setJdText] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingText, setLoadingText] = useState(LOADING_STEPS[0]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions().finally(() => setRefreshing(false));
  }, []);

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getSessionsList();
      setSessions(data);
    } catch (error) {
      console.error("Error loading sessions in Home:", error);
    }
  };

  // Animate through loading step labels while a generation is in progress.
  useEffect(() => {
    let loadingTimer: ReturnType<typeof setInterval>;
    if (loading) {
      let step = 0;
      setLoadingStep(0);
      setLoadingText(LOADING_STEPS[0]);
      loadingTimer = setInterval(() => {
        step += 1;
        if (step < LOADING_STEPS.length - 1) {
          setLoadingStep(step);
          setLoadingText(LOADING_STEPS[step]);
        }
      }, 1800);
    }
    return () => clearInterval(loadingTimer);
  }, [loading]);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: false,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      alert("Failed to pick document");
    }
  };

  const handleGenerate = async () => {
    if (activeTab === "resume" && !selectedFile) return;
    if (activeTab === "job" && !jdText.trim()) return;

    setLoading(true);
    try {
      let data;
      if (activeTab === "resume" && selectedFile) {
        const fileInput: ResumeFileInput = {
          uri: selectedFile.uri,
          name: selectedFile.name,
          mimeType: selectedFile.mimeType,
          file: selectedFile.file,
        };
        data = await api.generateFromResume(
          fileInput,
          undefined,
          undefined,
          user?.id,
        );
      } else {
        data = await api.generateFromJobs(jdText, user?.id);
      }

      // Advance to the final step before navigating.
      setLoadingStep(LOADING_STEPS.length - 1);
      setLoadingText(LOADING_STEPS[LOADING_STEPS.length - 1]);

      setTimeout(() => {
        setLoading(false);
        router.push({
          pathname: "/practice",
          params: { sessionId: data.sessionId },
        });
      }, 600);
    } catch (error: any) {
      setLoading(false);
      alert(
        error.message || "Failed to generate flashcards. Please try again.",
      );
    }
  };

  const isGenerateDisabled =
    (activeTab === "resume" && !selectedFile) ||
    (activeTab === "job" && !jdText.trim());

  if (loading) {
    return (
      <LoadingOverlay loadingText={loadingText} loadingStep={loadingStep} />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="layers-outline" size={24} color="#4F46E5" />
              <Text style={styles.headerTitle}>PrepDeck</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Your AI-Powered Interview Coach
            </Text>
            <Text style={styles.heroSubtitle}>
              Turn your experience and target roles into tailored interview
              questions—no hallucinations, just real prep.
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "resume" && styles.tabActive]}
              onPress={() => setActiveTab("resume")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "resume" && styles.tabTextActive,
                ]}
              >
                From Resume
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "job" && styles.tabActive]}
              onPress={() => setActiveTab("job")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "job" && styles.tabTextActive,
                ]}
              >
                From Job Description
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input Area */}
          <View style={styles.inputSection}>
            {activeTab === "resume" ? (
              <ResumeDropzone
                selectedFile={selectedFile}
                onPress={handleSelectFile}
              />
            ) : (
              <JobDescriptionInput value={jdText} onChange={setJdText} />
            )}
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[
              styles.generateBtn,
              isGenerateDisabled && styles.generateBtnDisabled,
            ]}
            onPress={handleGenerate}
            activeOpacity={0.85}
            disabled={isGenerateDisabled}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.generateBtnText}>Generate Flashcards</Text>
          </TouchableOpacity>

          {/* Recent Sessions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/library")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sessionList}>
            <RecentSessionsList
              sessions={sessions}
              onSessionPress={(id) =>
                router.push({
                  pathname: "/practice",
                  params: { sessionId: id },
                })
              }
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomTabBar currentScreen="home" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  scroll: { padding: 24, paddingBottom: 20 },

  // Loading overlay
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  loadingStep: { fontSize: 14, color: "#6B7280", marginBottom: 24 },
  progressDots: { flexDirection: "row", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: "#4F46E5" },
  dotInactive: { backgroundColor: "#E5E7EB" },
  loadingHint: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F46E5",
  },

  // Hero
  heroSection: { marginBottom: 24 },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },

  // Tab switcher
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F4F4F5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#4F46E5" },

  // Input section
  inputSection: { marginBottom: 24 },

  // Resume dropzone
  dropzone: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    marginBottom: 16,
  },
  dropzoneSelected: {
    borderColor: "#4F46E5",
    borderStyle: "solid",
    backgroundColor: "#FAFBFF",
  },
  uploadIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  dropzoneTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  dropzoneSub: { fontSize: 13, color: "#9CA3AF" },
  fileIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  fileSelectedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  fileSelectedSub: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  changeFilePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  changeFileText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },

  // Job description input
  textareaWrap: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 14,
  },
  textarea: {
    padding: 20,
    fontSize: 15,
    color: "#111827",
    minHeight: 200,
    lineHeight: 24,
  },
  charCount: {
    textAlign: "right",
    padding: 12,
    paddingTop: 0,
    fontSize: 12,
    color: "#9CA3AF",
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warnText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },
  readyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  readyText: { fontSize: 13, color: "#065F46", fontWeight: "600" },

  // Generate button
  generateBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 32,
  },
  generateBtnDisabled: { backgroundColor: "#A5B4FC", shadowOpacity: 0 },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Recent sessions
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  viewAll: { fontSize: 13, fontWeight: "600", color: "#4F46E5" },
  sessionList: { gap: 12, marginBottom: 32 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
  },
  sessionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sessionMeta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
});
