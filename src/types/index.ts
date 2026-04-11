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

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; textStyle: string; badgeStyle: string; cardStyle: string }
> = {
  p1: {
    label: "Needs Action",
    textStyle: "text-[#c06858]",
    badgeStyle: "bg-[#200c0c] text-[#c06858]",
    cardStyle: "bg-[#111c18] border-[0.5px] border-[#1e3028] hover:bg-[#162420]",
  },
  p2: {
    label: "High Priority",
    textStyle: "text-[#c89040]",
    badgeStyle: "bg-[#1e1608] text-[#c89040]",
    cardStyle: "bg-[#111c18] border-[0.5px] border-[#1e3028] hover:bg-[#162420]",
  },
  p3: {
    label: "Informational",
    textStyle: "text-[#b0a890]",
    badgeStyle: "bg-[rgba(255,255,255,0.06)] text-[#b0a890]",
    cardStyle: "bg-[#111c18] border-[0.5px] border-[#1e3028] hover:bg-[#162420]",
  },
  noise: {
    label: "Noise",
    textStyle: "text-[#6e6858]",
    badgeStyle: "bg-[rgba(255,255,255,0.06)] text-[#6e6858]",
    cardStyle: "bg-[#111c18] border-[0.5px] border-[#1e3028] hover:bg-[#162420]",
  },
};
