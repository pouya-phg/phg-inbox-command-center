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
      className={`px-4 py-3 cursor-pointer transition-all duration-[120ms] border-b-[0.5px] border-[#1c2226] ${
        isActive
          ? "bg-[rgba(180,138,70,0.06)]"
          : selected
            ? "bg-[rgba(255,255,255,0.02)]"
            : "bg-[#101418] hover:bg-[rgba(255,255,255,0.02)]"
      } ${email.is_read ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(email.message_id); }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-3.5 w-3.5 rounded border-[#1c2226] bg-[#101418] text-[#b48a46] cursor-pointer shrink-0 accent-[#b48a46]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-[10px] font-medium text-[#c8ccd0] truncate">
              {email.sender?.split("@")[0] || email.sender}
            </p>
            <span className="text-[8px] text-[rgba(200,204,208,0.40)] whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {!email.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#b48a46] shrink-0" />}
            <h3 className="text-[9px] font-medium text-[#c8ccd0] truncate">{email.subject || "(No Subject)"}</h3>
            {email.has_attachments && <Paperclip className="w-2.5 h-2.5 text-[#505860] shrink-0" />}
          </div>
          {email.summary && (
            <p className="text-[8px] text-[rgba(200,204,208,0.42)] truncate">{email.summary}</p>
          )}
        </div>
        <span className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-[3px] shrink-0 mt-0.5 tracking-[0.04em] ${config.badgeStyle}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
