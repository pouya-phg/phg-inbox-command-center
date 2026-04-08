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
  { label: string; color: string; bgColor: string }
> = {
  p1: {
    label: "Needs Action",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  },
  p2: {
    label: "High Priority",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
  },
  p3: {
    label: "Informational",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  noise: {
    label: "Noise",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
  },
};
