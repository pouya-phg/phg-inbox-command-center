"use client";

import { formatDistanceToNow } from "date-fns";
import { Paperclip } from "lucide-react";
import type { Email } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface EmailCardProps {
  email: Email;
  selected: boolean;
  isActive: boolean;
  onToggleSelect: (messageId: string) => void;
  onOpen: (email: Email) => void;
}

export default function EmailCard({ email, selected, isActive, onToggleSelect, onOpen }: EmailCardProps) {
  const config = PRIORITY_CONFIG[email.priority];

  return (
    <div
      onClick={() => onOpen(email)}
      className={`px-4 py-3.5 cursor-pointer transition-all duration-[120ms] border-b-[0.5px] border-[var(--border-subtle)] ${
        isActive
          ? "bg-[var(--accent-tint-soft)]"
          : selected
            ? "bg-[var(--hover-subtle)]"
            : "bg-[var(--bg-list)] hover:bg-[var(--hover-subtle)]"
      } ${email.is_read ? "opacity-55" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(email.message_id); }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 rounded border-[var(--checkbox-border)] bg-[var(--checkbox-bg)] text-[var(--accent)] cursor-pointer shrink-0 accent-[var(--accent)]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {email.sender?.split("@")[0] || email.sender}
            </p>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            {!email.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
            <h3 className="text-[13px] text-[var(--text-secondary)] truncate">{email.subject || "(No Subject)"}</h3>
            {email.has_attachments && <Paperclip className="w-3 h-3 text-[var(--text-muted)] shrink-0" />}
          </div>
          {email.summary && (
            <p className="text-[12px] text-[var(--text-muted)] truncate leading-relaxed">{email.summary}</p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 mt-0.5 tracking-[0.03em] ${config.badgeStyle}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
