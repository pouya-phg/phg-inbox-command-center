"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ExternalLink, Reply, ReplyAll, Forward, Send, Paperclip, CheckCircle, Loader2, Inbox, FileText, Image as ImageIcon, FileSpreadsheet, File, ImageOff } from "lucide-react";
import type { Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface GraphEmail { id: string; subject: string; body: { contentType: string; content: string }; from: { emailAddress: { name: string; address: string } }; toRecipients: { emailAddress: { name: string; address: string } }[]; ccRecipients: { emailAddress: { name: string; address: string } }[]; receivedDateTime: string; hasAttachments: boolean; isRead: boolean; webLink: string; }
interface Attachment { id: string; name: string; contentType: string; size: number; }
type ComposeMode = null | "reply" | "replyAll" | "forward";
interface EmailPanelProps { messageId: string | null; priority: Priority; summary: string | null; onMarkRead: (messageId: string) => void; }

function formatFileSize(bytes: number): string { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function getFileIcon(ct: string, n: string) { if (ct.startsWith("image/")) return <ImageIcon className="w-3.5 h-3.5" />; if (n.match(/\.(xlsx?|csv)$/i)) return <FileSpreadsheet className="w-3.5 h-3.5" />; if (n.match(/\.(pdf|docx?|pptx?)$/i)) return <FileText className="w-3.5 h-3.5" />; return <File className="w-3.5 h-3.5" />; }

const TRUSTED = ["microsoft.com","office.com","outlook.com","live.com","google.com","googleapis.com","googleusercontent.com","gstatic.com","github.com","githubusercontent.com","linkedin.com","licdn.com","gravatar.com","pacifichospitality.com"];
function isTrusted(s: string) { try { const u = new URL(s); return TRUSTED.some(d => u.hostname.endsWith(d)); } catch { return false; } }
function hasExtImages(h: string) { const r = /<img[^>]+src=["']?(https?:\/\/[^"'\s>]+)/gi; let m; while ((m = r.exec(h))) { if (!isTrusted(m[1])) return true; } return false; }
function blockImgs(h: string) { return h.replace(/(<img[^>]+src=["']?)(https?:\/\/[^"'\s>]+)/gi, (f, p, s) => isTrusted(s) ? f : `${p}data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'/%3E" data-blocked-src="${s}`); }

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[rgba(180,138,70,0.08)] flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-7 h-7 text-[#606870]" />
        </div>
        <p className="text-[14px] font-medium text-[#d0d4d8] mb-1">Select an email</p>
        <p className="text-[12px] text-[#606870]">Click any email on the left to read it here</p>
        <p className="text-[11px] text-[#404850] mt-3">J/K to navigate</p>
      </div>
    </div>
  );
}

export default function EmailPanel({ messageId, priority, summary, onMarkRead }: EmailPanelProps) {
  const [email, setEmail] = useState<GraphEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [composeText, setComposeText] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [imagesBlocked, setImagesBlocked] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (messageId) { fetchEmail(messageId); resetCompose(); setAttachments([]); setShowImages(false); setImagesBlocked(false); } else { setEmail(null); setAttachments([]); } }, [messageId]);
  useEffect(() => { if (composeMode && composeRef.current) composeRef.current.focus(); }, [composeMode]);
  function resetCompose() { setComposeMode(null); setComposeText(""); setForwardTo(""); setSent(false); }

  async function fetchEmail(id: string) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/emails/${id}`); if (!res.ok) throw new Error("Failed to load email");
      const data = await res.json(); setEmail(data);
      if (!data.isRead) onMarkRead(id);
      if (data.body?.content && hasExtImages(data.body.content)) { setImagesBlocked(true); setShowImages(false); } else { setImagesBlocked(false); setShowImages(true); }
      if (data.hasAttachments) { const r = await fetch(`/api/emails/${id}/attachments`); if (r.ok) { const d = await r.json(); setAttachments(d.attachments || []); } }
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }

  async function handleSend() {
    if (!email) return;
    setSending(true);
    try {
      if (composeMode === "forward") {
        if (!forwardTo.trim()) { setSending(false); return; }
        const r = await fetch("/api/forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: email.id, toRecipients: forwardTo.split(",").map(e => e.trim()).filter(Boolean), comment: composeText }) });
        if (!r.ok) throw new Error("Failed");
      } else {
        if (!composeText.trim()) { setSending(false); return; }
        const r = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: email.id, comment: composeText, replyAll: composeMode === "replyAll" }) });
        if (!r.ok) throw new Error("Failed");
      }
      setSent(true); setTimeout(resetCompose, 2000);
    } catch { setError("Failed to send"); }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } if (e.key === "Escape") resetCompose(); }

  if (!messageId) return <EmptyState />;
  const config = PRIORITY_CONFIG[priority];
  const bodyHtml = email?.body?.content || "";
  const processed = showImages ? bodyHtml : blockImgs(bodyHtml);
  const styled = processed ? `<style>
    * { color: #c0c4c8 !important; background: transparent !important; font-family: system-ui, -apple-system, sans-serif !important; }
    body { margin: 0; padding: 20px; font-size: 14px; line-height: 1.7; }
    a { color: #b48a46 !important; text-decoration: underline; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    blockquote { border-left: 2px solid #2a3038 !important; padding-left: 12px; margin-left: 0; color: #808890 !important; }
    hr { border: none; border-top: 0.5px solid #2a3038; }
    pre, code { background: #0a0e12 !important; padding: 2px 6px; border-radius: 3px; font-size: 13px; color: #8a9098 !important; }
    table { border-color: #2a3038 !important; } td, th { border-color: #2a3038 !important; padding: 4px 8px; }
  </style>${processed}` : "";

  return (
    <>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#b48a46] animate-spin" /></div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-[13px] text-[#b06050]">{error}</p><button onClick={() => messageId && fetchEmail(messageId)} className="mt-2 text-[12px] text-[#b48a46]">Try again</button></div></div>
      ) : email ? (
        <>
          {imagesBlocked && !showImages && (
            <div className="px-6 py-2.5 bg-[#1a1408] border-b-[0.5px] border-[rgba(180,138,70,0.20)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[12px] text-[#a07840]"><ImageOff className="w-3.5 h-3.5" /><span>External images hidden</span></div>
              <button onClick={() => setShowImages(true)} className="text-[12px] font-medium text-[#b48a46] hover:text-[#906830] transition-colors">Load images</button>
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-5 border-b-[0.5px] border-[#1e242a] shrink-0 bg-[#10161c]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[16px] font-medium text-[#d0d4d8] leading-snug">{email.subject || "(No Subject)"}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded tracking-[0.03em] ${config.badgeStyle}`}>{config.label}</span>
                <a href={email.webLink} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-[#606870] hover:text-[#b48a46] transition-colors"><ExternalLink className="w-4 h-4" /></a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[rgba(180,138,70,0.12)] flex items-center justify-center shrink-0">
                <span className="text-[12px] font-medium text-[#b48a46]">{email.from.emailAddress.name?.[0]?.toUpperCase() || "?"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[13px] font-medium text-[#d0d4d8]">{email.from.emailAddress.name}</p>
                  <p className="text-[11px] text-[#606870] truncate">{email.from.emailAddress.address}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#606870]">
                  <span>{format(new Date(email.receivedDateTime), "MMM d, yyyy 'at' h:mm a")}</span>
                  {email.toRecipients.length > 0 && (<><span className="text-[#2a3038]">to</span><span className="truncate">{email.toRecipients.map(r => r.emailAddress.name || r.emailAddress.address).join(", ")}</span></>)}
                  {email.hasAttachments && <Paperclip className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>

            {summary && (
              <div className="mt-3 px-3.5 py-2.5 bg-[rgba(180,138,70,0.07)] border-[0.5px] border-[rgba(180,138,70,0.20)] rounded-md">
                <p className="text-[10px] font-semibold text-[#b48a46] uppercase tracking-[0.10em] mb-1">AI Summary</p>
                <p className="text-[13px] text-[#c0c4c8] leading-relaxed">{summary}</p>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-medium text-[#8a9098] uppercase tracking-[0.08em] mb-1.5">Attachments ({attachments.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map(att => (
                    <a key={att.id} href={`/api/emails/${email.id}/attachments?attachmentId=${att.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(255,255,255,0.04)] border-[0.5px] border-[#2a3038] rounded text-[11px] text-[#8a9098] hover:text-[#d0d4d8] hover:border-[#b48a46] transition-colors group">
                      <span className="text-[#606870] group-hover:text-[#b48a46]">{getFileIcon(att.contentType, att.name)}</span>
                      <span className="truncate max-w-[160px]">{att.name}</span>
                      <span className="text-[10px] text-[#505860]">{formatFileSize(att.size)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-[#181e24]">
            <iframe srcDoc={styled} className="w-full h-full border-0" sandbox="allow-same-origin" title="Email" style={{ minHeight: "300px" }} />
          </div>

          {/* Actions */}
          <div className="border-t-[0.5px] border-[#1e242a] shrink-0 bg-[#10161c]">
            {!composeMode ? (
              <div className="flex items-center gap-2 px-6 py-3">
                <button onClick={() => setComposeMode("reply")} className="flex items-center gap-1.5 px-4 py-2 bg-[#b48a46] text-white text-[13px] font-medium rounded-md hover:bg-[#906830] transition-colors">
                  <Reply className="w-4 h-4" /> Reply
                </button>
                {(email.toRecipients.length > 1 || (email.ccRecipients?.length ?? 0) > 0) && (
                  <button onClick={() => setComposeMode("replyAll")} className="flex items-center gap-1.5 px-4 py-2 bg-[rgba(255,255,255,0.04)] text-[#8a9098] text-[13px] font-medium rounded-md border-[0.5px] border-[#2a3038] hover:text-[#d0d4d8] transition-colors">
                    <ReplyAll className="w-4 h-4" /> Reply All
                  </button>
                )}
                <button onClick={() => setComposeMode("forward")} className="flex items-center gap-1.5 px-4 py-2 bg-[rgba(255,255,255,0.04)] text-[#8a9098] text-[13px] font-medium rounded-md border-[0.5px] border-[#2a3038] hover:text-[#d0d4d8] transition-colors">
                  <Forward className="w-4 h-4" /> Forward
                </button>
              </div>
            ) : (
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-[#8a9098] uppercase tracking-[0.06em]">
                    {composeMode === "forward" ? "Forward" : composeMode === "replyAll" ? "Reply All" : "Reply"}{composeMode !== "forward" ? ` to ${email.from.emailAddress.name}` : ""}
                  </span>
                  <button onClick={resetCompose} className="text-[12px] text-[#606870] hover:text-[#d0d4d8] transition-colors">Cancel</button>
                </div>
                {composeMode === "forward" && (
                  <input type="text" placeholder="To: email@example.com (comma-separated)" value={forwardTo} onChange={(e) => setForwardTo(e.target.value)}
                    className="w-full bg-[#181e24] border-[0.5px] border-[#2a3038] rounded-md px-4 py-2.5 text-[13px] text-[#d0d4d8] placeholder-[#505860] focus:border-[#b48a46] focus:outline-none mb-2 transition-colors" />
                )}
                <textarea ref={composeRef} value={composeText} onChange={(e) => setComposeText(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={composeMode === "forward" ? "Add a note (optional)..." : "Write your reply..."}
                  rows={3} className="w-full bg-[#181e24] border-[0.5px] border-[#2a3038] rounded-md px-4 py-3 text-[13px] text-[#d0d4d8] placeholder-[#505860] focus:border-[#b48a46] focus:outline-none resize-none leading-relaxed transition-colors" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-[#505860]">{typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send</p>
                  <button onClick={handleSend} disabled={sending || (composeMode === "forward" ? !forwardTo.trim() : !composeText.trim())}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#b48a46] text-white text-[13px] font-medium rounded-md hover:bg-[#906830] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {sending ? "Sending..." : sent ? "Sent!" : composeMode === "forward" ? "Forward" : "Send"}
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
