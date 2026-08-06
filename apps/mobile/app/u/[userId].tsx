import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import {
  getBadges,
  getProfile,
  getProfileStats,
  isFollowing,
  toggleFollow,
  type BadgeSummary,
  type ProfileStats,
  type ProfileSummary,
} from '@/lib/community';
import { useAuth } from '@/lib/auth-context';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [badges, setBadges] = useState<BadgeSummary[]>([]);
  const [following, setFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getProfile(userId),
      getProfileStats(userId),
      getBadges(userId),
      session ? isFollowing(session.userId, userId) : Promise.resolve(false),
    ]).then(([p, s, b, f]) => {
      setProfile(p);
      setStats(s);
      setBadges(b);
      setFollowing(f);
      setIsLoading(false);
    });
  }, [userId, session]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Profile not found</Text>
      </View>
    );
  }

  const isSelf = session?.userId === userId;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Stack.Screen options={{ title: profile.displayName, headerShown: true }} />
      <Text style={styles.title}>{profile.displayName}</Text>
      {profile.bio ? <Text style={styles.body}>{profile.bio}</Text> : null}
      <Text style={styles.body}>
        {[profile.city, profile.province].filter(Boolean).join(', ')}
      </Text>

      {stats ? (
        <View style={styles.statsGrid}>
          <StatBox label="Reviews" value={stats.reviewCount} />
          <StatBox label="Helpful votes" value={stats.helpfulVotesReceived} />
          <StatBox label="Followers" value={stats.followerCount} />
          <StatBox label="Following" value={stats.followingCount} />
        </View>
      ) : null}

      {badges.length > 0 ? (
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgePill}>
              <Text style={styles.badgeText}>{badge.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!isSelf && session ? (
        <Pressable
          style={styles.button}
          onPress={async () => setFollowing(await toggleFollow(session.userId, userId))}
        >
          <Text style={styles.buttonText}>{following ? 'Following' : 'Follow'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundMain },
  center: {
    flex: 1,
    backgroundColor: colors.backgroundMain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textMain,
    fontSize: typography.size.xl,
    fontWeight: '600',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flexBasis: '47%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textMain,
    fontSize: typography.size.xl,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badgePill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.mutedGreen,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.accentGreen,
    fontSize: typography.size.xs,
  },
  button: {
    backgroundColor: colors.primaryGreen,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.backgroundMain,
    fontWeight: '600',
  },
});
