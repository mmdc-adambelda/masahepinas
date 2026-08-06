export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: number | null;
  icon: string | null;
}

export interface EarnedBadge extends Badge {
  awardedAt: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  isPrivate: boolean;
  createdAt: string;
}

export interface ProfileStats {
  reviewCount: number;
  verifiedReviewCount: number;
  helpfulVotesReceived: number;
  citiesReviewed: number;
  followerCount: number;
  followingCount: number;
}
