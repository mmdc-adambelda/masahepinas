import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@masahepinas/ui/tokens';
import { useAuth } from '@/lib/auth-context';

/**
 * Bottom navigation per docs/product-requirements.md §21: Explore, Map,
 * Saved, Community, Profile for the customer role. The owner-specific
 * five-tab set (Dashboard/Listing/Reviews/Analytics/Account) is introduced
 * in Phase 5 once the owner portal exists — role-aware nav swap happens
 * here once that's built.
 */
export default function TabsLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.backgroundSecondary, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.accentGreen,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Explore', tabBarIcon: () => <TabGlyph label="E" /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: () => <TabGlyph label="M" /> }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: 'Saved', tabBarIcon: () => <TabGlyph label="S" /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'Community', tabBarIcon: () => <TabGlyph label="C" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: () => <TabGlyph label="P" /> }}
      />
    </Tabs>
  );
}

// Placeholder glyphs — swapped for a real icon set (e.g. lucide-react-native)
// when the design system package grows in Phase 2.
function TabGlyph({ label }: { label: string }) {
  return <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>;
}
