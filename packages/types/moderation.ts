export interface RecommendationRecord {
  id: string;
  businessId: string;
  isRecommended: boolean;
  criteriaNotes: string | null;
  decidedAt: string;
}

export interface FeaturedPlacement {
  id: string;
  businessId: string;
  placementKey: string;
  startsAt: string | null;
  endsAt: string | null;
}

export type AppealStatus = 'open' | 'upheld' | 'overturned';

export interface Appeal {
  id: string;
  moderationActionId: string;
  submittedBy: string;
  message: string;
  status: AppealStatus;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}
