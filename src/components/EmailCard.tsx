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
      className={`px-4 py-3.5 cursor-pointer transition-all duration-[120ms] border-b-[0.5px] border-[#1e242a] ${
        isActive
          ? "bg-[rgba(180,138,70,0.08)]"
          : selected
            ? "bg-[rgba(255,255,255,0.03)]"
            : "bg-[#141a20] hover:bg-[rgba(255,255,255,0.03)]"
      } ${email.is_read ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(email.message_id); }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 rounded border-[#1e242a] bg-[#141a20] text-[#b48a46] cursor-pointer shrink-0 accent-[#b48a46]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[13px] font-medium text-[#d0d4d8] truncate">
              {email.sender?.split("@")[0] || email.sender}
            </p>
            <span className="text-[11px] text-[#606870] whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            {!email.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#b48a46] shrink-0" />}
            <h3 className="text-[13px] text-[#a0a8b0] truncate">{email.subject || "(No Subject)"}</h3>
            {email.has_attachments && <Paperclip className="w-3 h-3 text-[#505860] shrink-0" />}
          </div>
          {email.summary && (
            <p className="text-[12px] text-[#606870] truncate leading-relaxed">{email.summary}</p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 mt-0.5 tracking-[0.03em] ${config.badgeStyle}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
