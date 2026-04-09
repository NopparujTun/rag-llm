import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * SecureStore keys have a 2048-char limit and cannot contain '.'.
 * Supabase uses keys like "supabase.auth.token", so we encode them.
 */
const encodeKey = (key: string) =>
  key.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") return null;
    try {
      return await SecureStore.getItemAsync(encodeKey(key));
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.setItemAsync(encodeKey(key), value);
    } catch {
      // silently fail — session persistence non-critical
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.deleteItemAsync(encodeKey(key));
    } catch {
      // silently fail
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: Platform.OS !== "web",
    detectSessionInUrl: false,
  },
});
