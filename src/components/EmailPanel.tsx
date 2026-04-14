"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ExternalLink, Paperclip, CheckCircle, Loader2, Inbox, FileText, Image as ImageIcon, FileSpreadsheet, File, ImageOff, Sparkles, RotateCw, Trash2, ChevronDown, ChevronRight, Copy, Mail } from "lucide-react";
import type { Priority, DraftReply } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface GraphEmail { id: string; subject: string; body: { contentType: string; content: string }; from: { emailAddress: { name: string; address: string } }; toRecipients: { emailAddress: { name: string; address: string } }[]; ccRecipients: { emailAddress: { name: string; address: string } }[]; receivedDateTime: string; hasAttachments: boolean; isRead: boolean; webLink: string; }
interface Attachment { id: string; name: string; contentType: string; size: number; }
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
        <div className="w-16 h-16 rounded-full bg-[var(--accent-tint-soft)] flex items-center justify-center mx-auto mb-4">
          <Inbox className="w-7 h-7 text-[var(--text-muted)]" />
        </div>
        <p className="text-[14px] font-medium text-[var(--text-primary)] mb-1">Select an email</p>
        <p className="text-[12px] text-[var(--text-muted)]">Click any email on the left to read it here</p>
        <p className="text-[11px] text-[var(--text-faint)] mt-3">J/K to navigate · Reply in Outlook</p>
      </div>
    </div>
  );
}

export default function EmailPanel({ messageId, priority, summary, onMarkRead }: EmailPanelProps) {
  const [email, setEmail] = useState<GraphEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [imagesBlocked, setImagesBlocked] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [thread, setThread] = useState<GraphEmail[]>([]);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftReply | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    function checkTheme() { setIsLight(document.documentElement.getAttribute("data-theme") === "light"); }
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (messageId) {
      fetchEmail(messageId); fetchDraft(messageId);
      setAttachments([]); setShowImages(false); setImagesBlocked(false);
      setThread([]); setExpandedThreadIds(new Set()); setCopied(false);
    } else { setEmail(null); setAttachments([]); setDraft(null); setThread([]); }
  }, [messageId]);

  async function fetchDraft(id: string) {
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/drafts/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.draft) { setDraft(data.draft); setDraftText(data.draft.edited_body || data.draft.draft_body); }
        else { setDraft(null); setDraftText(""); }
      }
    } catch { setDraft(null); }
    setDraftLoading(false);
  }

  async function generateDraft() {
    if (!messageId) return;
    setDraftGenerating(true);
    try {
      const res = await fetch("/api/drafts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId }) });
      if (res.ok) { const data = await res.json(); setDraft(data.draft); setDraftText(data.draft.draft_body); }
    } catch {}
    setDraftGenerating(false);
  }

  async function saveDraftEdit() {
    if (!messageId || !draft) return;
    await fetch(`/api/drafts/${messageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edited_body: draftText }) });
  }

  async function copyDraft() {
    if (!draftText.trim()) return;
    await saveDraftEdit();
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError("Failed to copy to clipboard"); }
  }

  async function discardDraft() {
    if (!messageId) return;
    await fetch(`/api/drafts/${messageId}`, { method: "DELETE" });
    setDraft(null); setDraftText("");
  }

  async function fetchEmail(id: string) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/emails/${id}`); if (!res.ok) throw new Error("Failed to load email");
      const data = await res.json(); setEmail(data);
      if (!data.isRead) onMarkRead(id);
      if (data.body?.content && hasExtImages(data.body.content)) { setImagesBlocked(true); setShowImages(false); } else { setImagesBlocked(false); setShowImages(true); }
      if (data.hasAttachments) { const r = await fetch(`/api/emails/${id}/attachments`); if (r.ok) { const d = await r.json(); setAttachments(d.attachments || []); } }
      if (data.thread && data.thread.length > 1) { setThread(data.thread.filter((m: GraphEmail) => m.id !== id)); } else { setThread([]); }
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }

  function toggleThreadMessage(id: string) {
    setExpandedThreadIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  if (!messageId) return <EmptyState />;
  const config = PRIORITY_CONFIG[priority];
  const bodyHtml = email?.body?.content || "";
  const processed = showImages ? bodyHtml : blockImgs(bodyHtml);
  const iframeColors = isLight
    ? { text: "#1a1a2e", link: "#a88830", quote: "#5a5a72", border: "#e0e0e8", codeBg: "#f4f4f8", codeText: "#5a5a72" }
    : { text: "#c0c4c8", link: "#b48a46", quote: "#808890", border: "#2a3038", codeBg: "#0a0e12", codeText: "#8a9098" };
  const styled = processed ? `<style>
    * { color: ${iframeColors.text} !important; background: transparent !important; font-family: system-ui, -apple-system, sans-serif !important; }
    body { margin: 0; padding: 20px; font-size: 14px; line-height: 1.7; }
    a { color: ${iframeColors.link} !important; text-decoration: underline; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    blockquote { border-left: 2px solid ${iframeColors.border} !important; padding-left: 12px; margin-left: 0; color: ${iframeColors.quote} !important; }
    hr { border: none; border-top: 0.5px solid ${iframeColors.border}; }
    pre, code { background: ${iframeColors.codeBg} !important; padding: 2px 6px; border-radius: 3px; font-size: 13px; color: ${iframeColors.codeText} !important; }
    table { border-color: ${iframeColors.border} !important; } td, th { border-color: ${iframeColors.border} !important; padding: 4px 8px; }
  </style>${processed}` : "";

  return (
    <>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" /></div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-[13px] text-[var(--danger)]">{error}</p><button onClick={() => messageId && fetchEmail(messageId)} className="mt-2 text-[12px] text-[var(--accent)]">Try again</button></div></div>
      ) : email ? (
        <>
          {/* Image blocking banner */}
          {imagesBlocked && !showImages && (
            <div className="px-6 py-2.5 bg-[var(--warning-bg)] border-b-[0.5px] border-[var(--accent)]/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[12px] text-[var(--warning)]"><ImageOff className="w-3.5 h-3.5" /><span>External images hidden</span></div>
              <button onClick={() => setShowImages(true)} className="text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">Load images</button>
            </div>
          )}

          {/* Header — with "Open in Outlook" as PRIMARY action */}
          <div className="px-6 py-5 border-b-[0.5px] border-[var(--border-subtle)] shrink-0 bg-[var(--bg-header)]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] leading-snug">{email.subject || "(No Subject)"}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded tracking-[0.03em] ${config.badgeStyle}`}>{config.label}</span>
              </div>
            </div>

            {/* Open in Outlook — PRIMARY ACTION */}
            <a href={email.webLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-[var(--accent)] text-[var(--text-on-accent)] text-[13px] font-medium rounded-md hover:bg-[var(--accent-hover)] transition-colors">
              <Mail className="w-4 h-4" /> Open in Outlook
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--accent-tint-med)] flex items-center justify-center shrink-0">
                <span className="text-[12px] font-medium text-[var(--accent)]">{email.from.emailAddress.name?.[0]?.toUpperCase() || "?"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{email.from.emailAddress.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{email.from.emailAddress.address}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span>{format(new Date(email.receivedDateTime), "MMM d, yyyy 'at' h:mm a")}</span>
                  {email.toRecipients.length > 0 && (<><span className="text-[var(--border-mid)]">to</span><span className="truncate">{email.toRecipients.map(r => r.emailAddress.name || r.emailAddress.address).join(", ")}</span></>)}
                  {email.hasAttachments && <Paperclip className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {summary && (
              <div className="mt-3 px-3.5 py-2.5 bg-[var(--accent-tint-soft)] border-[0.5px] border-[var(--accent)]/30 rounded-md">
                <p className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-[0.10em] mb-1">AI Summary</p>
                <p className="text-[13px] text-[var(--text-body)] leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.08em] mb-1.5">Attachments ({attachments.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map(att => (
                    <a key={att.id} href={`/api/emails/${email.id}/attachments?attachmentId=${att.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--hover-subtle)] border-[0.5px] border-[var(--border-mid)] rounded text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors group">
                      <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)]">{getFileIcon(att.contentType, att.name)}</span>
                      <span className="truncate max-w-[160px]">{att.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{formatFileSize(att.size)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Draft Reply — with COPY TO CLIPBOARD */}
          {(draft || draftGenerating || draftLoading) && (
            <div className="px-6 py-4 border-b-[0.5px] border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-[0.10em]">AI Draft Reply</span>
                </div>
                {draft && !draftGenerating && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={generateDraft} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors">
                      <RotateCw className="w-3 h-3" /> Regenerate
                    </button>
                    <button onClick={discardDraft} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" /> Discard
                    </button>
                  </div>
                )}
              </div>
              {draftGenerating || draftLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                  <span className="text-[12px] text-[var(--text-muted)]">{draftGenerating ? "Generating draft..." : "Loading..."}</span>
                </div>
              ) : draft ? (
                <>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={saveDraftEdit}
                    spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                    rows={4}
                    className="w-full bg-[var(--bg-reading)] border-[0.5px] border-[var(--border-mid)] rounded-md px-3 py-2.5 text-[13px] text-[var(--text-body)] focus:border-[var(--accent)] focus:outline-none resize-none leading-relaxed transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {draft.doc_context ? "Context from OneDrive docs" : "Edit above, then copy to Outlook"}
                    </span>
                    <button
                      onClick={copyDraft}
                      disabled={!draftText.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--accent)] text-[var(--text-on-accent)] text-[12px] font-medium rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy Draft"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Generate draft button (when no draft exists) */}
          {!draft && !draftGenerating && !draftLoading && email && (
            <div className="px-6 py-3 border-b-[0.5px] border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0">
              <button onClick={generateDraft}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[var(--accent)] bg-[var(--accent-tint-soft)] border-[0.5px] border-[var(--accent)]/30 rounded-md hover:bg-[var(--accent-tint-med)] transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Generate Draft Reply
              </button>
            </div>
          )}

          {/* Body + Thread */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-reading)]">
            <iframe srcDoc={styled} className="w-full border-0" sandbox="allow-same-origin" title="Email" style={{ minHeight: "250px", height: thread.length > 0 ? "250px" : "100%" }} />

            {/* Thread history */}
            {thread.length > 0 && (
              <div className="border-t-[0.5px] border-[var(--border-subtle)]">
                <div className="px-5 py-2 bg-[var(--bg-elevated)]">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">
                    {thread.length} earlier message{thread.length > 1 ? "s" : ""} in this thread
                  </p>
                </div>
                {thread.map((msg) => {
                  const isExpanded = expandedThreadIds.has(msg.id);
                  const fromMe = msg.from?.emailAddress?.address?.toLowerCase() === "phonari@pacifichospitality.com";
                  const msgBody = msg.body?.content || "";
                  const msgStyled = msgBody ? `<style>
                    * { color: ${iframeColors.text} !important; background: transparent !important; font-family: system-ui, -apple-system, sans-serif !important; }
                    body { margin: 0; padding: 16px; font-size: 13px; line-height: 1.6; }
                    a { color: ${iframeColors.link} !important; text-decoration: underline; }
                    img { max-width: 100%; height: auto; }
                    blockquote { border-left: 2px solid ${iframeColors.border} !important; padding-left: 10px; margin-left: 0; color: ${iframeColors.quote} !important; }
                  </style>${showImages ? msgBody : blockImgs(msgBody)}` : "";

                  return (
                    <div key={msg.id} className="border-t-[0.5px] border-[var(--border-subtle)]">
                      <button onClick={() => toggleThreadMessage(msg.id)}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[var(--hover-subtle)] transition-colors">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${fromMe ? "bg-[var(--accent-tint-strong)]" : "bg-[var(--hover-active)]"}`}>
                          <span className={`text-[9px] font-medium ${fromMe ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"}`}>
                            {msg.from?.emailAddress?.name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[12px] font-medium ${fromMe ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                              {fromMe ? "You" : msg.from?.emailAddress?.name || msg.from?.emailAddress?.address}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {format(new Date(msg.receivedDateTime), "MMM d 'at' h:mm a")}
                            </span>
                          </div>
                          {!isExpanded && (
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {msg.body?.content?.replace(/<[^>]+>/g, "").substring(0, 120) || "(No content)"}
                            </p>
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-3">
                          <div className="text-[11px] text-[var(--text-muted)] mb-2">
                            To: {(msg.toRecipients || []).map(r => r.emailAddress?.name || r.emailAddress?.address).join(", ")}
                          </div>
                          <iframe srcDoc={msgStyled} className="w-full border-0 rounded" sandbox="allow-same-origin"
                            title={`Thread message from ${msg.from?.emailAddress?.name}`} style={{ minHeight: "150px", height: "200px" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom bar — Open in Outlook reminder (no compose) */}
          <div className="border-t-[0.5px] border-[var(--border-subtle)] shrink-0 bg-[var(--bg-header)] px-6 py-2.5">
            <p className="text-[11px] text-[var(--text-muted)]">
              Reply, forward, and compose in Outlook for full reliability
            </p>
          </div>
        </>
      ) : null}
    </>
  );
}
