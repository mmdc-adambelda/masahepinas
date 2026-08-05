import { useCallback, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import { ListingListItem } from '@/components/ListingListItem';
import { searchListings, type ListingSummary } from '@/lib/spa-businesses';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const runSearch = useCallback(async (q: string) => {
    setIsLoading(true);
    const found = await searchListings(q);
    setResults(found);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    runSearch('');
  }, [runSearch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>
      <TextInput
        style={styles.input}
        placeholder="Search business, city, or service"
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => runSearch(query)}
        returnKeyType="search"
      />

      {isLoading ? (
        <ActivityIndicator color={colors.accentGreen} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={({ item }) => <ListingListItem listing={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No listings found. Try a different search.</Text>
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
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: colors.textMain,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.size.base,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
