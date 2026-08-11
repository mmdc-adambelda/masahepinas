import { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '@masahepinas/ui/tokens';
import { ListingListItem } from '@/components/ListingListItem';
import { searchListings, type ListingSummary } from '@/lib/spa-businesses';

/**
 * A real interactive native map (MapLibre React Native) needs a custom
 * native module, which doesn't run in Expo Go — it requires an EAS
 * development build. The web app's map-discovery UI has been retired in
 * favor of province-based listing (see apps/web/components/SearchFilters.tsx),
 * and this screen follows the same direction: it shows the same
 * location-sorted results as a distance-ordered list rather than an
 * interactive map.
 */
export default function MapScreen() {
  const [results, setResults] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    searchListings('').then((found) => {
      setResults(found);
      setIsLoading(false);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.note}>
        Interactive map view is coming with the next app update. For now, here are nearby
        listings — open one to see its address.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.accentGreen} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={({ item }) => <ListingListItem listing={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No listings yet.</Text>}
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
    gap: spacing.sm,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.size['2xl'],
    fontWeight: '600',
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
