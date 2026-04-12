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
    textStyle: "text-[#9a2828]",
    badgeStyle: "bg-[#faecec] text-[#9a2828]",
    cardStyle: "bg-white border-[0.5px] border-[#e0e0e8] hover:bg-[#f7f7f9]",
  },
  p2: {
    label: "High Priority",
    textStyle: "text-[#8a5a10]",
    badgeStyle: "bg-[#faf2e0] text-[#8a5a10]",
    cardStyle: "bg-white border-[0.5px] border-[#e0e0e8] hover:bg-[#f7f7f9]",
  },
  p3: {
    label: "Informational",
    textStyle: "text-[#607088]",
    badgeStyle: "bg-[#eef0f6] text-[#607088]",
    cardStyle: "bg-white border-[0.5px] border-[#e0e0e8] hover:bg-[#f7f7f9]",
  },
  noise: {
    label: "Noise",
    textStyle: "text-[#9898b0]",
    badgeStyle: "bg-[#eeeef2] text-[#5a5a72]",
    cardStyle: "bg-white border-[0.5px] border-[#e0e0e8] hover:bg-[#f7f7f9]",
  },
};
