"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  CheckCircle,
  Paperclip,
  Mail,
} from "lucide-react";
import type { Email } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface EmailCardProps {
  email: Email;
  onMarkRead: (messageId: string) => void;
}

export default function EmailCard({ email, onMarkRead }: EmailCardProps) {
  const config = PRIORITY_CONFIG[email.priority];

  return (
    <div
      className={`border rounded-lg p-4 ${config.bgColor} ${
        email.is_read ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${config.color} bg-white/50`}
            >
              {config.label}
            </span>
            {email.has_attachments && (
              <Paperclip className="w-3 h-3 text-gray-400" />
            )}
            {email.is_read && (
              <span className="text-xs text-gray-400">Read</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {email.subject || "(No Subject)"}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">{email.sender}</p>
          {email.summary && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">
              {email.summary}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap">
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
                className="p-1.5 rounded hover:bg-white/50 text-gray-500 hover:text-blue-600"
                title="Open in Outlook"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {!email.is_read && (
              <button
                onClick={() => onMarkRead(email.message_id)}
                className="p-1.5 rounded hover:bg-white/50 text-gray-500 hover:text-green-600"
                title="Mark as read"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
