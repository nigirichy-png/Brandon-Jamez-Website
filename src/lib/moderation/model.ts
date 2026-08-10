export const moderationSeverities = ["low", "medium", "high"] as const;
export const moderationStatuses = ["pending", "in_review", "escalated", "reviewed", "archived"] as const;

export type ModerationSeverity = (typeof moderationSeverities)[number];
export type ModerationStatus = (typeof moderationStatuses)[number];

export type ModerationCase = {
  id: string;
  title: string;
  source_type: string;
  category: string;
  severity: ModerationSeverity;
  summary: string;
  evidence_reference: string | null;
  status: ModerationStatus;
  assigned_to_current_user: boolean;
  assigned_to_label: string | null;
  created_at: string;
  updated_at: string;
};

export type ModerationCaseHistory = {
  id: number;
  case_id: string;
  from_status: ModerationStatus | null;
  to_status: ModerationStatus;
  note: string | null;
  changed_at: string;
  changed_by_label: string;
};
