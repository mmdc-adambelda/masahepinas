import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import type { ListingSummary } from '@/lib/spa-businesses';

export function ListingListItem({ listing }: { listing: ListingSummary }) {
  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push(`/spa/${listing.slug}`)}
    >
      {listing.primaryImageUrl ? (
        <Image source={{ uri: listing.primaryImageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>No photo</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.badgeRow}>
          {listing.isPremium ? (
            <View style={[styles.badge, { backgroundColor: colors.warning }]}>
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          ) : null}
          {listing.isRecommended ? (
            <View style={[styles.badge, { backgroundColor: colors.primaryGreen }]}>
              <Text style={styles.badgeText}>Recommended</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {listing.businessName}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {listing.cityMunicipality}, {listing.province}
        </Text>
        <Text style={styles.rating}>
          {listing.reviewCount > 0
            ? `★ ${listing.averageRating.toFixed(1)} (${listing.reviewCount})`
            : 'No reviews yet'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
  },
  imagePlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.backgroundMain,
  },
  name: {
    color: colors.textMain,
    fontSize: typography.size.base,
    fontWeight: '600',
  },
  location: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  rating: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
});
