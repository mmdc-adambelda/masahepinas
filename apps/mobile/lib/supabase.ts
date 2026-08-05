import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createSupabaseClient, type TypedSupabaseClient } from '@masahepinas/database';

/**
 * SecureStore-backed session storage so auth tokens are encrypted at rest
 * on-device, matching the "secure authentication cookies"/session handling
 * requirement from docs/security-checklist.md (mobile equivalent of
 * httpOnly cookies on web).
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase: TypedSupabaseClient = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    storage: ExpoSecureStoreAdapter,
  },
);
