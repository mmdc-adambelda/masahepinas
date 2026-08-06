import type { ClaimStatus } from './enums';

export interface OwnerDashboardStats {
  status: string;
  averageRating: number;
  reviewCount: number;
  savedCount: number;
  profileViews: number;
  contactClicks: number;
  directionClicks: number;
  responseRate: number; // 0-1
}

export interface BusinessClaim {
  id: string;
  businessId: string;
  businessName: string;
  claimantUserId: string;
  claimantDisplayName: string;
  status: ClaimStatus;
  supportingDocumentPath: string | null;
  notes: string | null;
  createdAt: string;
}
