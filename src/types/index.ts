export type Priority = "p1" | "p2" | "p3" | "noise";

export interface Email {
  id: string;
  message_id: string;
  subject: string;
  sender: string;
  received_at: string;
  is_read: boolean;
  priority: Priority;
  summary: string | null;
  category: string | null;
  has_attachments: boolean;
  web_link: string | null;
  processed_at: string | null;
}

export interface TriageRule {
  id: string;
  rule_name: string;
  conditions: RuleCondition[];
  action: Priority;
  is_active: boolean;
}

export interface RuleCondition {
  field: "sender" | "subject" | "body";
  operator: "contains" | "equals" | "starts_with";
  value: string;
}

export interface SyncState {
  last_synced_at: string | null;
  total_processed: number;
  delta_link: string | null;
  nightly_sync_enabled: boolean;
}

export interface DraftReply {
  id: string;
  email_id: string;
  subject: string | null;
  draft_body: string;
  edited_body: string | null;
  status: "draft" | "edited" | "sent" | "regenerating";
  doc_context: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; textStyle: string; badgeStyle: string }
> = {
  p1: {
    label: "Needs Action",
    textStyle: "text-[var(--accent)]",
    badgeStyle: "bg-[var(--accent-tint-strong)] text-[var(--accent)]",
  },
  p2: {
    label: "High Priority",
    textStyle: "text-[var(--warning)]",
    badgeStyle: "bg-[var(--warning-bg)] text-[var(--warning)]",
  },
  p3: {
    label: "Informational",
    textStyle: "text-[var(--text-tertiary)]",
    badgeStyle: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]",
  },
  noise: {
    label: "Noise",
    textStyle: "text-[var(--text-muted)]",
    badgeStyle: "bg-[var(--badge-neutral-bg)] text-[var(--text-muted)]",
  },
};
