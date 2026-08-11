import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Linking,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import { DAY_NAMES } from '@masahepinas/types';
import {
  getListingBySlug,
  isSaved,
  toggleSaved,
  type ListingDetail,
} from '@/lib/spa-businesses';
import {
  getMyReview,
  getReviewsForBusiness,
  submitReview,
  toggleHelpfulVote,
  type ReviewItem,
} from '@/lib/reviews';
import { useAuth } from '@/lib/auth-context';

export default function SpaDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [myReview, setMyReview] = useState<{
    id: string;
    overallRating: number;
    body: string;
  } | null>(null);
  const [draftRating, setDraftRating] = useState(5);
  const [draftBody, setDraftBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadReviews = useCallback(
    async (businessId: string) => {
      setReviews(await getReviewsForBusiness(businessId));
      if (session) {
        const mine = await getMyReview(businessId, session.userId);
        setMyReview(mine);
        if (mine) {
          setDraftRating(mine.overallRating);
          setDraftBody(mine.body);
        }
      }
    },
    [session],
  );

  useEffect(() => {
    if (!slug) return;
    getListingBySlug(slug).then(async (found) => {
      setListing(found);
      if (found && session) {
        setSaved(await isSaved(session.userId, found.id));
      }
      if (found) await loadReviews(found.id);
      setIsLoading(false);
    });
  }, [slug, session, loadReviews]);

  async function handleSubmitReview() {
    if (!listing || !session || draftBody.trim().length < 10) {
      setReviewError('Write at least 10 characters.');
      return;
    }
    setIsSubmittingReview(true);
    setReviewError(null);
    const result = await submitReview(
      listing.id,
      session.userId,
      draftRating,
      draftBody.trim(),
      myReview?.id ?? null,
    );
    setIsSubmittingReview(false);
    if (result.error) {
      setReviewError(result.error);
      return;
    }
    await loadReviews(listing.id);
  }

  async function handleHelpful(reviewId: string) {
    if (!session) return;
    await toggleHelpfulVote(reviewId, session.userId);
    if (listing) await loadReviews(listing.id);
  }

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
        {listing.latitude != null && listing.longitude != null ? (
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
        ) : null}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>

        {!session ? (
          <Text style={styles.body}>Sign in to write a review.</Text>
        ) : (
          <View style={styles.reviewForm}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setDraftRating(n)}>
                  <Text
                    style={[styles.star, n <= draftRating ? styles.starActive : null]}
                  >
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review…"
              placeholderTextColor={colors.textSecondary}
              value={draftBody}
              onChangeText={setDraftBody}
              multiline
            />
            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
            <Pressable
              style={styles.actionButton}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              <Text style={styles.actionButtonText}>
                {isSubmittingReview
                  ? 'Saving…'
                  : myReview
                    ? 'Update review'
                    : 'Submit review'}
              </Text>
            </Pressable>
          </View>
        )}

        {reviews.length === 0 ? (
          <Text style={styles.body}>No reviews yet — be the first.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Pressable onPress={() => router.push(`/u/${review.customerId}`)}>
                  <Text style={styles.reviewAuthor}>{review.customerDisplayName}</Text>
                </Pressable>
                <Text style={styles.body}>★ {review.overallRating}</Text>
              </View>
              <Text style={styles.body}>{review.body}</Text>
              {review.replyBody ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Response from the owner</Text>
                  <Text style={styles.body}>{review.replyBody}</Text>
                </View>
              ) : null}
              <Pressable onPress={() => handleHelpful(review.id)}>
                <Text style={styles.helpfulText}>Helpful ({review.helpfulCount})</Text>
              </Pressable>
            </View>
          ))
        )}
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
  reviewForm: {
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  starActive: {
    color: colors.warning,
  },
  reviewInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: colors.textMain,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.size.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.size.xs,
  },
  reviewCard: {
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    color: colors.textMain,
    fontSize: typography.size.sm,
    fontWeight: '600',
  },
  replyBox: {
    borderLeftWidth: 2,
    borderLeftColor: colors.mutedGreen,
    paddingLeft: spacing.sm,
    marginTop: 4,
  },
  replyLabel: {
    color: colors.accentGreen,
    fontSize: typography.size.xs,
    fontWeight: '600',
  },
  helpfulText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 4,
  },
});
