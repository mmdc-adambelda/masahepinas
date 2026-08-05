import { useCallback, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, typography } from '@masahepinas/ui/tokens';
import { ListingListItem } from '@/components/ListingListItem';
import { listSavedBusinesses, type ListingSummary } from '@/lib/spa-businesses';
import { useAuth } from '@/lib/auth-context';

export default function SavedScreen() {
  const { session } = useAuth();
  const [saved, setSaved] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setSaved(await listSavedBusinesses(session.userId));
    setIsLoading(false);
  }, [session]);

  // Re-fetch whenever this tab regains focus, so saving/unsaving from the
  // detail screen is reflected without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.accentGreen} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={({ item }) => <ListingListItem listing={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              You haven&apos;t saved any spas yet. Save one from Explore.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundMain,
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.size['2xl'],
    fontWeight: '600',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
