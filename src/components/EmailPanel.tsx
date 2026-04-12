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
function getFileIcon(contentType: string, name: string) { if (contentType.startsWith("image/")) return <ImageIcon className="w-3 h-3" />; if (name.match(/\.(xlsx?|csv)$/i)) return <FileSpreadsheet className="w-3 h-3" />; if (name.match(/\.(pdf|docx?|pptx?)$/i)) return <FileText className="w-3 h-3" />; return <File className="w-3 h-3" />; }

const TRUSTED_DOMAINS = ["microsoft.com","office.com","outlook.com","live.com","google.com","googleapis.com","googleusercontent.com","gstatic.com","github.com","githubusercontent.com","linkedin.com","licdn.com","gravatar.com","pacifichospitality.com"];
function isTrusted(src: string) { try { const u = new URL(src); return TRUSTED_DOMAINS.some(d => u.hostname.endsWith(d)); } catch { return false; } }
function hasExternalImages(html: string) { const r = /<img[^>]+src=["']?(https?:\/\/[^"'\s>]+)/gi; let m; while ((m = r.exec(html))) { if (!isTrusted(m[1])) return true; } return false; }
function blockImages(html: string) { return html.replace(/(<img[^>]+src=["']?)(https?:\/\/[^"'\s>]+)/gi, (f, p, s) => isTrusted(s) ? f : `${p}data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'/%3E" data-blocked-src="${s}`); }

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-[rgba(180,138,70,0.08)] flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-6 h-6 text-[#505860]" />
        </div>
        <p className="text-[11px] font-medium text-[#c8ccd0] mb-1">Select an email</p>
        <p className="text-[9px] text-[#505860]">Click any email on the left to read it here</p>
        <p className="text-[8px] text-[#505860] mt-2">J/K to navigate</p>
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
      const res = await fetch(`/api/emails/${id}`);
      if (!res.ok) throw new Error("Failed to load email");
      const data = await res.json();
      setEmail(data);
      if (!data.isRead) onMarkRead(id);
      if (data.body?.content && hasExternalImages(data.body.content)) { setImagesBlocked(true); setShowImages(false); } else { setImagesBlocked(false); setShowImages(true); }
      if (data.hasAttachments) { const r = await fetch(`/api/emails/${id}/attachments`); if (r.ok) { const d = await r.json(); setAttachments(d.attachments || []); } }
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    setLoading(false);
  }

  async function handleSend() {
    if (!email) return;
    if (composeMode === "forward") {
      if (!forwardTo.trim()) return; setSending(true);
      try { const r = await fetch("/api/forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: email.id, toRecipients: forwardTo.split(",").map(e => e.trim()).filter(Boolean), comment: composeText }) }); if (!r.ok) throw new Error("Failed"); setSent(true); setTimeout(resetCompose, 2000); } catch { setError("Failed to forward"); }
      setSending(false);
    } else {
      if (!composeText.trim()) return; setSending(true);
      try { const r = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: email.id, comment: composeText, replyAll: composeMode === "replyAll" }) }); if (!r.ok) throw new Error("Failed"); setSent(true); setTimeout(resetCompose, 2000); } catch { setError("Failed to send"); }
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } if (e.key === "Escape") resetCompose(); }

  if (!messageId) return <EmptyState />;
  const config = PRIORITY_CONFIG[priority];
  const bodyHtml = email?.body?.content || "";
  const processed = showImages ? bodyHtml : blockImages(bodyHtml);
  const styled = processed ? `<style>
    * { color: rgba(200,204,208,0.70) !important; background: transparent !important; font-family: system-ui, -apple-system, sans-serif !important; }
    body { margin: 0; padding: 14px; font-size: 9px; line-height: 1.7; }
    a { color: #b48a46 !important; text-decoration: underline; }
    img { max-width: 100%; height: auto; border-radius: 3px; }
    blockquote { border-left: 2px solid #1c2226 !important; padding-left: 10px; margin-left: 0; color: rgba(200,204,208,0.45) !important; }
    hr { border: none; border-top: 0.5px solid #1c2226; }
    pre, code { background: #0c1014 !important; padding: 2px 5px; border-radius: 3px; font-size: 9px; color: #8a9098 !important; }
    table { border-color: #1c2226 !important; } td, th { border-color: #1c2226 !important; padding: 3px 6px; }
  </style>${processed}` : "";

  return (
    <>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#b48a46] animate-spin" /></div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-[10px] text-[#b06050]">{error}</p><button onClick={() => messageId && fetchEmail(messageId)} className="mt-2 text-[9px] text-[#b48a46]">Try again</button></div></div>
      ) : email ? (
        <>
          {/* Image banner */}
          {imagesBlocked && !showImages && (
            <div className="px-5 py-2 bg-[#1a1208] border-b-[0.5px] border-[rgba(180,138,70,0.20)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[9px] text-[#a07840]"><ImageOff className="w-3 h-3" /><span>External images hidden</span></div>
              <button onClick={() => setShowImages(true)} className="text-[9px] font-medium text-[#b48a46] hover:text-[#906830] transition-colors">Load images</button>
            </div>
          )}

          {/* Header */}
          <div className="px-5 py-4 border-b-[0.5px] border-[#1c2226] shrink-0 bg-[#0e1216]">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <h2 className="text-[12px] font-medium text-[#c8ccd0] leading-[1.4]">{email.subject || "(No Subject)"}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-[3px] tracking-[0.04em] ${config.badgeStyle}`}>{config.label}</span>
                <a href={email.webLink} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-[#505860] hover:text-[#b48a46] transition-colors"><ExternalLink className="w-3 h-3" /></a>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[rgba(180,138,70,0.10)] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-medium text-[#b48a46]">{email.from.emailAddress.name?.[0]?.toUpperCase() || "?"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[10px] font-medium text-[#c8ccd0]">{email.from.emailAddress.name}</p>
                  <p className="text-[8px] text-[rgba(200,204,208,0.42)] truncate">{email.from.emailAddress.address}</p>
                </div>
                <div className="flex items-center gap-2 text-[8px] text-[rgba(200,204,208,0.42)]">
                  <span>{format(new Date(email.receivedDateTime), "MMM d, yyyy 'at' h:mm a")}</span>
                  {email.toRecipients.length > 0 && (<><span className="text-[#1c2226]">to</span><span className="truncate">{email.toRecipients.map(r => r.emailAddress.name || r.emailAddress.address).join(", ")}</span></>)}
                  {email.hasAttachments && <Paperclip className="w-2.5 h-2.5" />}
                </div>
              </div>
            </div>

            {summary && (
              <div className="mt-2.5 px-3 py-2 bg-[rgba(180,138,70,0.07)] border-[0.5px] border-[rgba(180,138,70,0.20)] rounded-md">
                <p className="text-[8px] font-semibold text-[#b48a46] uppercase tracking-[0.10em] mb-0.5">AI Summary</p>
                <p className="text-[9px] text-[#c8ccd0] leading-[1.55]">{summary}</p>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[8px] font-medium text-[#8a9098] uppercase tracking-[0.08em] mb-1">Attachments ({attachments.length})</p>
                <div className="flex flex-wrap gap-1">
                  {attachments.map(att => (
                    <a key={att.id} href={`/api/emails/${email.id}/attachments?attachmentId=${att.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-[rgba(255,255,255,0.05)] border-[0.5px] border-[#1c2226] rounded text-[8px] text-[rgba(200,204,208,0.60)] hover:text-[#c8ccd0] hover:border-[#b48a46] transition-colors group">
                      <span className="text-[#8a9098] group-hover:text-[#b48a46]">{getFileIcon(att.contentType, att.name)}</span>
                      <span className="truncate max-w-[140px]">{att.name}</span>
                      <span className="text-[7px] text-[#505860]">{formatFileSize(att.size)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-[#101418]">
            <iframe srcDoc={styled} className="w-full h-full border-0" sandbox="allow-same-origin" title="Email" style={{ minHeight: "280px" }} />
          </div>

          {/* Action bar */}
          <div className="border-t-[0.5px] border-[#1c2226] shrink-0 bg-[#0e1216]">
            {!composeMode ? (
              <div className="flex items-center gap-1.5 px-5 py-2.5">
                <button onClick={() => setComposeMode("reply")} className="flex items-center gap-1.5 px-3 py-[5px] bg-[#b48a46] text-white text-[10px] font-medium rounded-[5px] hover:bg-[#906830] transition-colors">
                  <Reply className="w-3 h-3" /> Reply
                </button>
                {(email.toRecipients.length > 1 || (email.ccRecipients?.length ?? 0) > 0) && (
                  <button onClick={() => setComposeMode("replyAll")} className="flex items-center gap-1.5 px-3 py-[5px] bg-[rgba(255,255,255,0.04)] text-[rgba(200,204,208,0.45)] text-[10px] font-medium rounded-[5px] border-[0.5px] border-[#1c2226] hover:text-[#c8ccd0] transition-colors">
                    <ReplyAll className="w-3 h-3" /> Reply All
                  </button>
                )}
                <button onClick={() => setComposeMode("forward")} className="flex items-center gap-1.5 px-3 py-[5px] bg-[rgba(255,255,255,0.04)] text-[rgba(200,204,208,0.45)] text-[10px] font-medium rounded-[5px] border-[0.5px] border-[#1c2226] hover:text-[#c8ccd0] transition-colors">
                  <Forward className="w-3 h-3" /> Forward
                </button>
              </div>
            ) : (
              <div className="px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-medium text-[#8a9098] uppercase tracking-[0.08em]">
                    {composeMode === "forward" ? "Forward" : composeMode === "replyAll" ? "Reply All" : "Reply"}{composeMode !== "forward" ? ` to ${email.from.emailAddress.name}` : ""}
                  </span>
                  <button onClick={resetCompose} className="text-[9px] text-[#505860] hover:text-[#c8ccd0] transition-colors">Cancel</button>
                </div>
                {composeMode === "forward" && (
                  <input type="text" placeholder="To: email@example.com (comma-separated)" value={forwardTo} onChange={(e) => setForwardTo(e.target.value)}
                    className="w-full bg-[#101418] border-[0.5px] border-[#1c2226] rounded-md px-3 py-2 text-[10px] text-[#c8ccd0] placeholder-[#505860] focus:border-[#b48a46] focus:outline-none mb-2 transition-colors" />
                )}
                <textarea ref={composeRef} value={composeText} onChange={(e) => setComposeText(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={composeMode === "forward" ? "Add a note (optional)..." : "Write your reply..."}
                  rows={3} className="w-full bg-[#101418] border-[0.5px] border-[#1c2226] rounded-md px-3 py-2.5 text-[10px] text-[#c8ccd0] placeholder-[#505860] focus:border-[#b48a46] focus:outline-none resize-none leading-relaxed transition-colors" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[8px] text-[#505860]">{typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send</p>
                  <button onClick={handleSend} disabled={sending || (composeMode === "forward" ? !forwardTo.trim() : !composeText.trim())}
                    className="flex items-center gap-1.5 px-3 py-[5px] bg-[#b48a46] text-white text-[10px] font-medium rounded-[5px] hover:bg-[#906830] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : sent ? <CheckCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
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
