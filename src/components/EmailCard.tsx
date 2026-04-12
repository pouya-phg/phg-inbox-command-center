"use client";

import { formatDistanceToNow } from "date-fns";
import { ExternalLink, CheckCircle, Paperclip } from "lucide-react";
import type { Email } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface EmailCardProps {
  email: Email;
  selected: boolean;
  isActive: boolean;
  onToggleSelect: (messageId: string) => void;
  onMarkRead: (messageId: string) => void;
  onOpen: (email: Email) => void;
}

export default function EmailCard({
  email,
  selected,
  isActive,
  onToggleSelect,
  onMarkRead,
  onOpen,
}: EmailCardProps) {
  const config = PRIORITY_CONFIG[email.priority];

  return (
    <div
      onClick={() => onOpen(email)}
      className={`rounded-[10px] p-4 transition-all duration-150 cursor-pointer ${
        isActive
          ? "bg-[#162420] border-[0.5px] border-[#c8a040]/30"
          : config.cardStyle
      } ${email.is_read ? "opacity-50" : ""} ${
        selected && !isActive ? "ring-2 ring-[#c8a040]/40" : ""
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
          className="mt-1 h-4 w-4 rounded border-[#264038] bg-[#111c18] text-[#c8a040] cursor-pointer shrink-0 accent-[#c8a040]"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.badgeStyle}`}
            >
              {config.label}
            </span>
            {email.has_attachments && (
              <Paperclip className="w-3 h-3 text-[#6e6858]" />
            )}
            {!email.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8a040]" />
            )}
          </div>
          <h3 className="font-medium text-[#f0ece4] truncate text-sm">
            {email.subject || "(No Subject)"}
          </h3>
          <p className="text-xs text-[#6e6858] mt-0.5">{email.sender}</p>
          {email.summary && (
            <p className="text-[13px] text-[#b0a890] mt-1.5 line-clamp-1 leading-relaxed">
              {email.summary}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[10px] text-[#6e6858] whitespace-nowrap">
            {formatDistanceToNow(new Date(email.received_at), {
              addSuffix: true,
            })}
          </span>
          <div className="flex gap-1">
            {email.web_link && (
              <a
                href={email.web_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md text-[#6e6858] hover:text-[#c8a040] hover:bg-[#162420] transition-colors"
                title="Open in Outlook"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {!email.is_read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(email.message_id);
                }}
                className="p-1.5 rounded-md text-[#6e6858] hover:text-[#60c880] hover:bg-[#0c2018] transition-colors"
                title="Mark as read"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
