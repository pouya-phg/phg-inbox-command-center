"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  X,
  ExternalLink,
  Reply,
  ReplyAll,
  Send,
  Paperclip,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface GraphEmail {
  id: string;
  subject: string;
  body: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  ccRecipients: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  hasAttachments: boolean;
  isRead: boolean;
  webLink: string;
}

interface EmailPanelProps {
  messageId: string;
  priority: Priority;
  summary: string | null;
  onClose: () => void;
  onMarkRead: (messageId: string) => void;
}

export default function EmailPanel({
  messageId,
  priority,
  summary,
  onClose,
  onMarkRead,
}: EmailPanelProps) {
  const [email, setEmail] = useState<GraphEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [replyAll, setReplyAll] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmail();
  }, [messageId]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (showReply && replyRef.current) {
      replyRef.current.focus();
    }
  }, [showReply]);

  async function fetchEmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emails/${messageId}`);
      if (!res.ok) throw new Error("Failed to load email");
      const data = await res.json();
      setEmail(data);
      if (!data.isRead) {
        onMarkRead(messageId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  }

  async function handleSendReply() {
    if (!replyText.trim() || !email) return;
    setSending(true);
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: email.id,
          comment: replyText,
          replyAll,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setReplyText("");
      setTimeout(() => {
        setSent(false);
        setShowReply(false);
      }, 2000);
    } catch {
      setError("Failed to send reply");
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendReply();
    }
  }

  const config = PRIORITY_CONFIG[priority];

  // Inject dark theme styles into email body
  const styledBody = email?.body?.content
    ? `<style>
        * { color: #f0ece4 !important; background: transparent !important; font-family: system-ui, -apple-system, sans-serif !important; }
        body { margin: 0; padding: 0; font-size: 14px; line-height: 1.6; }
        a { color: #c8a040 !important; }
        img { max-width: 100%; height: auto; border-radius: 4px; }
        table { border-color: #1e3028 !important; }
        td, th { border-color: #1e3028 !important; }
        blockquote { border-left: 2px solid #264038 !important; padding-left: 12px; margin-left: 0; opacity: 0.7; }
        hr { border-color: #1e3028 !important; }
        pre, code { background: #0f1a16 !important; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
      </style>${email.body.content}`
    : "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-full lg:w-[56%] xl:w-[52%] z-50 bg-[#0f1a16] border-l-[0.5px] border-[#1e3028] flex flex-col animate-in slide-in-from-right duration-200"
        style={{
          animation: "slideIn 200ms ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-[0.5px] border-[#1e3028] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${config.badgeStyle}`}
            >
              {config.label}
            </span>
            {email && (
              <a
                href={email.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6e6858] hover:text-[#c8a040] transition-colors shrink-0"
                title="Open in Outlook"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#6e6858] hover:text-[#f0ece4] hover:bg-[#162420] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-6 h-6 text-[#c8a040] animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#6e6858]">Loading email...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[#c06858]">{error}</p>
              <button
                onClick={fetchEmail}
                className="mt-3 text-sm text-[#c8a040] hover:text-[#a88030]"
              >
                Try again
              </button>
            </div>
          </div>
        ) : email ? (
          <>
            {/* Email header */}
            <div className="px-6 py-5 border-b-[0.5px] border-[#1e3028] shrink-0">
              <h2 className="text-lg font-medium text-[#f0ece4] leading-tight mb-3">
                {email.subject || "(No Subject)"}
              </h2>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[rgba(200,160,64,0.15)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-[#c8a040]">
                        {email.from.emailAddress.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#f0ece4] truncate">
                        {email.from.emailAddress.name}
                      </p>
                      <p className="text-xs text-[#6e6858] truncate">
                        {email.from.emailAddress.address}
                      </p>
                    </div>
                  </div>
                  {email.toRecipients.length > 0 && (
                    <p className="text-xs text-[#6e6858] mt-2 truncate">
                      <span className="text-[#b0a890]">To:</span>{" "}
                      {email.toRecipients
                        .map((r) => r.emailAddress.name || r.emailAddress.address)
                        .join(", ")}
                    </p>
                  )}
                  {email.ccRecipients?.length > 0 && (
                    <p className="text-xs text-[#6e6858] mt-0.5 truncate">
                      <span className="text-[#b0a890]">Cc:</span>{" "}
                      {email.ccRecipients
                        .map((r) => r.emailAddress.name || r.emailAddress.address)
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#6e6858]">
                    {format(new Date(email.receivedDateTime), "MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-[#6e6858] mt-0.5">
                    {format(new Date(email.receivedDateTime), "h:mm a")}
                  </p>
                  {email.hasAttachments && (
                    <Paperclip className="w-3 h-3 text-[#6e6858] mt-1 ml-auto" />
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {summary && (
                <div className="mt-3 px-3 py-2 bg-[rgba(200,160,64,0.08)] border-[0.5px] border-[rgba(200,160,64,0.15)] rounded-md">
                  <p className="text-[10px] font-medium text-[#c8a040] uppercase tracking-[0.08em] mb-1">
                    AI Summary
                  </p>
                  <p className="text-sm text-[#b0a890] leading-relaxed">
                    {summary}
                  </p>
                </div>
              )}
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto">
              <iframe
                srcDoc={styledBody}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
                title="Email content"
                style={{ minHeight: "300px", background: "transparent" }}
              />
            </div>

            {/* Reply bar */}
            <div className="border-t-[0.5px] border-[#1e3028] shrink-0">
              {!showReply ? (
                <div className="flex items-center gap-2 px-6 py-3">
                  <button
                    onClick={() => {
                      setReplyAll(false);
                      setShowReply(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#c8a040] text-white text-sm font-medium rounded-md hover:bg-[#a88030] transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                  {email.toRecipients.length > 1 ||
                  (email.ccRecipients?.length ?? 0) > 0 ? (
                    <button
                      onClick={() => {
                        setReplyAll(true);
                        setShowReply(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[rgba(200,160,64,0.12)] text-[#c8a040] text-sm font-medium rounded-md border-[0.5px] border-[#264038] hover:bg-[rgba(200,160,64,0.20)] transition-colors"
                    >
                      <ReplyAll className="w-4 h-4" />
                      Reply All
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium text-[#b0a890] uppercase tracking-[0.08em]">
                      {replyAll ? "Reply All" : "Reply"} to{" "}
                      {email.from.emailAddress.name}
                    </span>
                    <button
                      onClick={() => {
                        setShowReply(false);
                        setReplyText("");
                      }}
                      className="ml-auto text-xs text-[#6e6858] hover:text-[#f0ece4] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write your reply..."
                    rows={4}
                    className="w-full bg-[#111c18] border-[0.5px] border-[#264038] rounded-lg px-4 py-3 text-sm text-[#f0ece4] placeholder-[#6e6858] focus:border-[#c8a040] focus:outline-none resize-none leading-relaxed transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-[#6e6858]">
                      {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to
                      send
                    </p>
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#c8a040] text-white text-sm font-medium rounded-md hover:bg-[#a88030] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : sent ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sending ? "Sending..." : sent ? "Sent!" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
