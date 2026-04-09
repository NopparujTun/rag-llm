import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  text: string;
}

interface AIAssistantScreenProps {
  cardQuestion: string;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ChatBubbleProps {
  message: Message;
}

/** Renders a single chat message bubble — either user or AI. */
function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={12} color="#4F46E5" />
        </View>
      )}
      <View
        style={[
          styles.bubbleInner,
          isUser ? styles.bubbleInnerUser : styles.bubbleInnerAI,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAI,
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}

/** Animated "typing" indicator shown while the AI is generating a response. */
function TypingIndicator() {
  return (
    <View style={[styles.bubble, styles.bubbleAI]}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={12} color="#4F46E5" />
      </View>
      <View
        style={[styles.bubbleInner, styles.bubbleInnerAI, styles.typingBubble]}
      >
        <Text style={styles.typingDots}>● ● ●</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * AIAssistantScreen provides a chat interface for users to ask follow-up
 * questions about the current flashcard topic. Currently uses mock responses
 * while the real AI integration is pending.
 */
export function AIAssistantScreen({
  cardQuestion,
  onBack,
}: AIAssistantScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "sys",
      role: "system",
      text: `I'm your AI interview coach! I'm here to help you deeply understand the topic: "${cardQuestion.slice(0, 60)}..."\n\nAsk me to explain concepts, give examples, or suggest follow-up questions.`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: inputText.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      // Build history for the API — only user/assistant turns, oldest first.
      const history = [...messages, userMsg]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.text,
        }));

      const reply = await api.chat(cardQuestion, history);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: `Sorry, I couldn't reach the AI right now. Please check your connection and try again.\n\n(${err?.message ?? "Unknown error"})`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
          </View>
          <View style={styles.aiDot}>
            <View style={styles.aiDotInner} />
          </View>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask a follow-up question..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 14,
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  aiDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  aiDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },

  messageList: { padding: 20, gap: 14, paddingBottom: 8 },
  bubble: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleUser: { flexDirection: "row-reverse" },
  bubbleAI: { flexDirection: "row" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  bubbleInner: { maxWidth: "78%", borderRadius: 16, padding: 14 },
  bubbleInnerUser: { backgroundColor: "#4F46E5", borderBottomRightRadius: 4 },
  bubbleInnerAI: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: "#fff", fontWeight: "500" },
  bubbleTextAI: { color: "#1F2937" },
  typingBubble: { paddingVertical: 12 },
  typingDots: { color: "#9CA3AF", letterSpacing: 4, fontSize: 14 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#C7D2FE" },
});
