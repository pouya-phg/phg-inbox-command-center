"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  ExternalLink,
  Reply,
  ReplyAll,
  Send,
  Paperclip,
  CheckCircle,
  Loader2,
  Inbox,
  FileText,
  Image,
  FileSpreadsheet,
  File,
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

interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

interface EmailPanelProps {
  messageId: string | null;
  priority: Priority;
  summary: string | null;
  onMarkRead: (messageId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string, name: string) {
  if (contentType.startsWith("image/")) return <Image className="w-3.5 h-3.5" />;
  if (name.match(/\.(xlsx?|csv)$/i) || contentType.includes("spreadsheet")) return <FileSpreadsheet className="w-3.5 h-3.5" />;
  if (name.match(/\.(pdf|docx?|pptx?)$/i) || contentType.includes("pdf") || contentType.includes("document")) return <FileText className="w-3.5 h-3.5" />;
  return <File className="w-3.5 h-3.5" />;
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#eef0f6] flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-7 h-7 text-[#8090a8]" />
        </div>
        <p className="text-[15px] font-medium text-[#1a1a2e] mb-1">
          Select an email
        </p>
        <p className="text-[13px] text-[#9898b0]">
          Click any email on the left to read it here
        </p>
        <p className="text-[11px] text-[#cacad8] mt-3">
          J/K or arrows to navigate
        </p>
      </div>
    </div>
  );
}

export default function EmailPanel({
  messageId,
  priority,
  summary,
  onMarkRead,
}: EmailPanelProps) {
  const [email, setEmail] = useState<GraphEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [replyAll, setReplyAll] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messageId) {
      fetchEmail(messageId);
      setShowReply(false);
      setReplyText("");
      setSent(false);
      setAttachments([]);
    } else {
      setEmail(null);
      setAttachments([]);
    }
  }, [messageId]);

  useEffect(() => {
    if (showReply && replyRef.current) replyRef.current.focus();
  }, [showReply]);

  async function fetchEmail(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emails/${id}`);
      if (!res.ok) throw new Error("Failed to load email");
      const data = await res.json();
      setEmail(data);
      if (!data.isRead) onMarkRead(id);

      // Fetch attachments if the email has them
      if (data.hasAttachments) {
        const attRes = await fetch(`/api/emails/${id}/attachments`);
        if (attRes.ok) {
          const attData = await attRes.json();
          setAttachments(attData.attachments || []);
        }
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
        body: JSON.stringify({ messageId: email.id, comment: replyText, replyAll }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setReplyText("");
      setTimeout(() => { setSent(false); setShowReply(false); }, 2000);
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
    if (e.key === "Escape") {
      setShowReply(false);
      setReplyText("");
    }
  }

  if (!messageId) return <EmptyState />;

  const config = PRIORITY_CONFIG[priority];

  const styledBody = email?.body?.content
    ? `<style>
        * { color: #1a1a2e !important; background: transparent !important; font-family: system-ui, -apple-system, sans-serif !important; }
        body { margin: 0; padding: 16px; font-size: 14px; line-height: 1.65; }
        a { color: #607088 !important; text-decoration: underline; }
        img { max-width: 100%; height: auto; border-radius: 4px; }
        blockquote { border-left: 2px solid #cacad8 !important; padding-left: 12px; margin-left: 0; color: #5a5a72 !important; }
        hr { border: none; border-top: 0.5px solid #e0e0e8; }
        pre, code { background: #f4f4f8 !important; padding: 2px 6px; border-radius: 3px; font-size: 13px; color: #607088 !important; }
        table { border-color: #e0e0e8 !important; }
        td, th { border-color: #e0e0e8 !important; padding: 4px 8px; }
      </style>${email.body.content}`
    : "";

  return (
    <>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#8090a8] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-[#9a2828]">{error}</p>
            <button
              onClick={() => messageId && fetchEmail(messageId)}
              className="mt-2 text-sm text-[#8090a8] hover:text-[#607088]"
            >
              Try again
            </button>
          </div>
        </div>
      ) : email ? (
        <>
          {/* Email header */}
          <div className="px-6 py-5 border-b-[0.5px] border-[#e0e0e8] shrink-0 bg-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[17px] font-medium text-[#1a1a2e] leading-snug">
                {email.subject || "(No Subject)"}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${config.badgeStyle}`}>
                  {config.label}
                </span>
                <a
                  href={email.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded text-[#9898b0] hover:text-[#607088] transition-colors"
                  title="Open in Outlook"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#eef0f6] flex items-center justify-center shrink-0">
                <span className="text-[11px] font-medium text-[#607088]">
                  {email.from.emailAddress.name?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[13px] font-medium text-[#1a1a2e]">
                    {email.from.emailAddress.name}
                  </p>
                  <p className="text-[11px] text-[#9898b0] truncate">
                    {email.from.emailAddress.address}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#9898b0]">
                  <span>
                    {format(new Date(email.receivedDateTime), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  {email.toRecipients.length > 0 && (
                    <>
                      <span className="text-[#cacad8]">to</span>
                      <span className="truncate">
                        {email.toRecipients.map((r) => r.emailAddress.name || r.emailAddress.address).join(", ")}
                      </span>
                    </>
                  )}
                  {email.hasAttachments && <Paperclip className="w-3 h-3" />}
                </div>
              </div>
            </div>

            {summary && (
              <div className="mt-3 px-3 py-2 bg-[#faf4e8] border-[0.5px] border-[#f0e8d0] rounded-md">
                <p className="text-[10px] font-medium text-[#8a5a10] uppercase tracking-[0.08em] mb-0.5">
                  AI Summary
                </p>
                <p className="text-[13px] text-[#5a5a72] leading-relaxed">
                  {summary}
                </p>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-medium text-[#5a5a72] uppercase tracking-[0.08em] mb-1.5">
                  Attachments ({attachments.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/emails/${email.id}/attachments?attachmentId=${att.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f4f4f8] border-[0.5px] border-[#e0e0e8] rounded-md text-[12px] text-[#5a5a72] hover:bg-[#eef0f6] hover:border-[#cacad8] hover:text-[#607088] transition-colors group"
                      title={`${att.name} (${formatFileSize(att.size)})`}
                    >
                      <span className="text-[#9898b0] group-hover:text-[#8090a8] transition-colors">
                        {getFileIcon(att.contentType, att.name)}
                      </span>
                      <span className="truncate max-w-[160px]">{att.name}</span>
                      <span className="text-[10px] text-[#9898b0] shrink-0">
                        {formatFileSize(att.size)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email body */}
          <div className="flex-1 overflow-y-auto bg-white">
            <iframe
              srcDoc={styledBody}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
              title="Email content"
              style={{ minHeight: "300px" }}
            />
          </div>

          {/* Reply bar */}
          <div className="border-t-[0.5px] border-[#e0e0e8] shrink-0 bg-white">
            {!showReply ? (
              <div className="flex items-center gap-2 px-6 py-3">
                <button
                  onClick={() => { setReplyAll(false); setShowReply(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a88830] text-white text-[13px] font-medium rounded-md hover:bg-[#886810] transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply
                </button>
                {(email.toRecipients.length > 1 || (email.ccRecipients?.length ?? 0) > 0) && (
                  <button
                    onClick={() => { setReplyAll(true); setShowReply(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eef0f6] text-[#607088] text-[13px] font-medium rounded-md border-[0.5px] border-[#cacad8] hover:bg-[#e0e4ec] transition-colors"
                  >
                    <ReplyAll className="w-3.5 h-3.5" />
                    Reply All
                  </button>
                )}
              </div>
            ) : (
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-[#5a5a72] uppercase tracking-[0.08em]">
                    {replyAll ? "Reply All" : "Reply"} to {email.from.emailAddress.name}
                  </span>
                  <button
                    onClick={() => { setShowReply(false); setReplyText(""); }}
                    className="text-[11px] text-[#9898b0] hover:text-[#1a1a2e] transition-colors"
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
                  className="w-full bg-white border-[0.5px] border-[#cacad8] rounded-lg px-4 py-3 text-[14px] text-[#1a1a2e] placeholder-[#9898b0] focus:border-[#8090a8] focus:outline-none resize-none leading-relaxed transition-colors"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-[#9898b0]">
                    {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
                  </p>
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#a88830] text-white text-[13px] font-medium rounded-md hover:bg-[#886810] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : sent ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {sending ? "Sending..." : sent ? "Sent!" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
