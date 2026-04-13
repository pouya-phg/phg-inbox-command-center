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
    textStyle: "text-[#b48a46]",
    badgeStyle: "bg-[rgba(180,138,70,0.16)] text-[#b48a46]",
  },
  p2: {
    label: "High Priority",
    textStyle: "text-[#a07840]",
    badgeStyle: "bg-[#1a1208] text-[#a07840]",
  },
  p3: {
    label: "Informational",
    textStyle: "text-[#707880]",
    badgeStyle: "bg-[rgba(255,255,255,0.05)] text-[#707880]",
  },
  noise: {
    label: "Noise",
    textStyle: "text-[#505860]",
    badgeStyle: "bg-[rgba(255,255,255,0.04)] text-[#505860]",
  },
};
