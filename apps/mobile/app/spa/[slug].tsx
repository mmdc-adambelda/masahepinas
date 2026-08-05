import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import { DAY_NAMES } from '@masahepinas/types';
import {
  getListingBySlug,
  isSaved,
  toggleSaved,
  type ListingDetail,
} from '@/lib/spa-businesses';
import { useAuth } from '@/lib/auth-context';

export default function SpaDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getListingBySlug(slug).then(async (found) => {
      setListing(found);
      if (found && session) {
        setSaved(await isSaved(session.userId, found.id));
      }
      setIsLoading(false);
    });
  }, [slug, session]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.name}>Listing not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Stack.Screen options={{ title: listing.businessName, headerShown: true }} />

      {listing.images.length > 0 ? (
        <Image source={{ uri: listing.images[0] }} style={styles.hero} />
      ) : null}

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

      <Text style={styles.name}>{listing.businessName}</Text>
      <Text style={styles.location}>
        {listing.addressLine}, {listing.cityMunicipality}, {listing.province}
      </Text>
      <Text style={styles.rating}>
        {listing.reviewCount > 0
          ? `★ ${listing.averageRating.toFixed(1)} (${listing.reviewCount} reviews)`
          : 'No reviews yet'}
      </Text>

      <View style={styles.actionRow}>
        {listing.contactNumber ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => Linking.openURL(`tel:${listing.contactNumber}`)}
          >
            <Text style={styles.actionButtonText}>Call</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.actionButton}
          onPress={() =>
            Linking.openURL(
              `https://www.openstreetmap.org/directions?to=${listing.latitude}%2C${listing.longitude}`,
            )
          }
        >
          <Text style={styles.actionButtonText}>Directions</Text>
        </Pressable>
        {session ? (
          <Pressable
            style={[styles.actionButton, saved ? styles.actionButtonActive : null]}
            onPress={async () => setSaved(await toggleSaved(session.userId, listing.id))}
          >
            <Text style={styles.actionButtonText}>{saved ? '★ Saved' : '☆ Save'}</Text>
          </Pressable>
        ) : null}
      </View>

      {listing.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body}>{listing.description}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating hours</Text>
        {listing.hours
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((h) => (
            <View key={h.dayOfWeek} style={styles.hourRow}>
              <Text style={styles.hourDay}>{DAY_NAMES[h.dayOfWeek]}</Text>
              <Text style={styles.body}>
                {h.isClosed
                  ? 'Closed'
                  : `${h.openTime?.slice(0, 5)} – ${h.closeTime?.slice(0, 5)}`}
              </Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundMain,
  },
  center: {
    flex: 1,
    backgroundColor: colors.backgroundMain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.backgroundMain,
  },
  name: {
    color: colors.textMain,
    fontSize: typography.size.xl,
    fontWeight: '600',
  },
  location: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  rating: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.mutedGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButtonActive: {
    borderColor: colors.accentGreen,
  },
  actionButtonText: {
    color: colors.accentGreen,
    fontSize: typography.size.sm,
    fontWeight: '600',
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.textMain,
    fontSize: typography.size.base,
    fontWeight: '600',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  hourDay: {
    color: colors.textMain,
    fontSize: typography.size.sm,
  },
});
