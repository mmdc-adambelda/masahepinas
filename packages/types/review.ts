import type {
  ModerationActionType,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ReviewModerationStatus,
} from './enums';

export const REVIEW_CATEGORIES = [
  'service_quality',
  'professionalism',
  'cleanliness',
  'ambience',
  'value_for_money',
] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

export interface Review {
  id: string;
  businessId: string;
  customerId: string;
  customerDisplayName: string;
  customerAvatarUrl: string | null;
  overallRating: number;
  body: string;
  serviceDate: string | null;
  isVerifiedVisit: boolean;
  helpfulCount: number;
  moderationStatus: ReviewModerationStatus;
  categoryRatings: Partial<Record<ReviewCategory, number>>;
  reply: ReviewReply | null;
  wasEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReply {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface ModerationAction {
  id: string;
  moderatorId: string;
  actionType: ModerationActionType;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}
