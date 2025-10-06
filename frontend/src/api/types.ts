export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'removed';

export type MetricsOverview = {
  totalUsers: number;
  blockedUsers: number;
  totalReports: number;
  approvedReports: number;
  pendingReports: number;
  totalFlags: number;
  pendingFlags: number;
  validatedFlags: number;
  dismissedFlags: number;
};

export type MetricsTopCategory = {
  id: number;
  name: string;
  slug: string;
  reportsCount: number;
  searchCount: number;
};

export type MetricsTopHost = {
  host: string;
  reportsCount: number;
  approvedReportsCount: number;
  pendingReportsCount: number;
  rejectedReportsCount: number;
  removedReportsCount: number;
};

export type FraudStats = {
  averageDetectionDays: number;
  totalReportsApproved: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  totalActiveUsers: number;
  categoriesCount: number;
};

export type AdminReport = {
  reportId: number;
  title: string | null;
  status: ReportStatus;
  categoryId: number;
  categoryName: string | null;
  author: {
    id: number;
    email: string | null;
    name: string | null;
  };
  reviewer: {
    id: number;
    name: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  reviewNotes: string | null;
  rejectionReasonText: string | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type AdminReportsResponse = {
  items: AdminReport[];
  meta: PaginationMeta;
};

export type ReportFlagStatus = 'pending' | 'validated' | 'dismissed';
export type ReportFlagReason =
  | 'duplicate'
  | 'false-information'
  | 'spam'
  | 'offensive-content'
  | 'other';

export type AdminReportFlag = {
  flagId: number;
  reportId: number;
  reportTitle: string | null;
  reportStatus: ReportStatus;
  reasonCode: ReportFlagReason;
  details: string | null;
  status: ReportFlagStatus;
  createdAt: string;
  handledAt: string | null;
  reporter: {
    id: number;
    email: string | null;
    name: string | null;
  };
  handler: {
    id: number;
    name: string | null;
  } | null;
};

export type AdminReportFlagsResponse = {
  items: AdminReportFlag[];
  meta: PaginationMeta;
  counts: {
    pending: number;
    validated: number;
    dismissed: number;
  };
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  reports_count: number;
  search_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateCategoryPayload = {
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
};

export type UpdateCategoryPayload = Partial<CreateCategoryPayload> & {
  reports_count?: number;
  search_count?: number;
};

export type ModerateReportPayload = {
  action: 'approve' | 'reject';
  reportId: number;
  revisionId?: number;
  rejectionReasonId?: number;
  rejectionReasonCode?: string | null;
  rejectionReasonText?: string | null;
  note?: string | null;
};

export type ResolveReportFlagPayload = {
  status: ReportFlagStatus;
};
