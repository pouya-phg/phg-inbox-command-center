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

export default function EmailCard({
  email,
  selected,
  isActive,
  onToggleSelect,
  onOpen,
}: EmailCardProps) {
  const config = PRIORITY_CONFIG[email.priority];

  return (
    <div
      onClick={() => onOpen(email)}
      className={`px-4 py-3 cursor-pointer transition-all duration-100 border-b-[0.5px] border-[#e0e0e8] ${
        isActive
          ? "bg-[#eef0f6] border-l-2 border-l-[#8090a8]"
          : "bg-white hover:bg-[#f7f7f9] border-l-2 border-l-transparent"
      } ${email.is_read ? "opacity-55" : ""} ${
        selected ? "bg-[#eef0f6]" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(email.message_id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-3.5 w-3.5 rounded border-[#cacad8] bg-white text-[#8090a8] cursor-pointer shrink-0 accent-[#8090a8]"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-[13px] font-medium text-[#1a1a2e] truncate">
              {email.sender?.split("@")[0] || email.sender}
            </p>
            <span className="text-[10px] text-[#9898b0] whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(email.received_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {!email.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8090a8] shrink-0" />
            )}
            <h3 className="text-[13px] text-[#1a1a2e] truncate font-normal">
              {email.subject || "(No Subject)"}
            </h3>
            {email.has_attachments && (
              <Paperclip className="w-3 h-3 text-[#9898b0] shrink-0" />
            )}
          </div>
          {email.summary && (
            <p className="text-[12px] text-[#9898b0] truncate leading-relaxed">
              {email.summary}
            </p>
          )}
        </div>

        <span
          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${config.badgeStyle}`}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}
