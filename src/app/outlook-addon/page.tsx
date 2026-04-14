"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Copy, CheckCircle, RotateCw, Trash2, Loader2, ExternalLink, Inbox, AlertCircle, Bell, VolumeX, Mail, ChevronDown, ChevronRight } from "lucide-react";

type Priority = "p1" | "p2" | "p3" | "noise";
interface EmailData {
  id: string;
  message_id: string;
  subject: string;
  sender: string;
  priority: Priority;
  summary: string | null;
  received_at: string;
  is_read: boolean;
  web_link: string | null;
}

const API_BASE = "";
const ADDON_KEY = process.env.NEXT_PUBLIC_ADDON_API_KEY || "";

function addonFetch(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  headers.set("x-addon-key", ADDON_KEY);
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

const P_CONFIG: Record<Priority, { label: string; icon: any; color: string; bg: string }> = {
  p1: { label: "Needs Action", icon: AlertCircle, color: "#9a2828", bg: "#faecec" },
  p2: { label: "High Priority", icon: Bell, color: "#8a5a10", bg: "#faf2e0" },
  p3: { label: "Informational", icon: Inbox, color: "#607088", bg: "#eef0f6" },
  noise: { label: "Noise", icon: VolumeX, color: "#9898b0", bg: "#eeeef2" },
};

// Open email in Outlook
function openInOutlook(email: EmailData) {
  const Office = (window as any).Office;

  // Method 1: Use Office.js displayMessageFormAsync — opens in reading pane on new Outlook
  if (Office?.context?.mailbox) {
    try {
      // displayMessageFormAsync navigates the main window on new Outlook
      Office.context.mailbox.displayMessageFormAsync(email.message_id, (result: any) => {
        if (result.status === "failed" && email.web_link) {
          // Fallback to web link if Office.js fails
          window.open(email.web_link, "_blank");
        }
      });
      return;
    } catch {}
  }

  // Method 2: Outlook deep link protocol (works on desktop)
  if (email.web_link) {
    // Convert OWA link to native outlook protocol
    // ms-outlook://emails/open works on Windows, OWA link works cross-platform
    window.open(email.web_link, "_blank");
  }
}

type Tab = "overview" | "selected";

// Inline draft component for email cards
function InlineDraft({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [generating, setGenerating] = useState(true);
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Check for existing draft first
        const existing = await addonFetch(`/api/drafts/${messageId}`);
        if (existing.ok) {
          const d = await existing.json();
          if (d.draft) {
            setDraftText(d.draft.edited_body || d.draft.draft_body);
            setGenerating(false);
            return;
          }
        }
        // Generate new draft
        const res = await addonFetch("/api/drafts/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
        if (res.ok) {
          const d = await res.json();
          setDraftText(d.draft.draft_body);
        } else {
          setError(true);
        }
      } catch { setError(true); }
      setGenerating(false);
    })();
  }, [messageId]);

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const accent = "#a88830";
  const textM = "#9898b0";
  const border = "#e0e0e8";
  const bg = "#f7f7f9";

  if (generating) {
    return (
      <div style={{ padding: "10px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <Loader2 size={14} color={accent} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 12, color: textM }}>Generating AI draft...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "8px 0" }}>
        <p style={{ fontSize: 12, color: "#9a2828", margin: 0 }}>Failed to generate draft</p>
        <button onClick={onClose} style={{ fontSize: 11, color: textM, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>Dismiss</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Sparkles size={12} color={accent} />
        <span style={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Draft</span>
        <button onClick={onClose} style={{ marginLeft: "auto", fontSize: 11, color: textM, background: "none", border: "none", cursor: "pointer" }}>Dismiss</button>
      </div>
      <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)}
        spellCheck={true} rows={4}
        style={{ width: "100%", boxSizing: "border-box", background: bg, border: `0.5px solid ${border}`,
          borderRadius: 6, padding: 8, fontSize: 13, color: "#1a1a2e", lineHeight: 1.5, resize: "none", outline: "none", fontFamily: "inherit" }} />
      <button onClick={copyDraft} disabled={!draftText.trim()}
        style={{ width: "100%", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, padding: "7px 12px", background: accent, color: "#fff", fontSize: 13, fontWeight: 500,
          border: "none", borderRadius: 6, cursor: "pointer", opacity: draftText.trim() ? 1 : 0.4 }}>
        {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
        {copied ? "Copied! Paste in Outlook" : "Copy Draft to Clipboard"}
      </button>
    </div>
  );
}

export default function OutlookAddonPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [counts, setCounts] = useState<Record<Priority, number>>({ p1: 0, p2: 0, p3: 0, noise: 0 });
  const [p1Emails, setP1Emails] = useState<EmailData[]>([]);
  const [p2Emails, setP2Emails] = useState<EmailData[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedDraftText, setSelectedDraftText] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [selectedDraftGenerating, setSelectedDraftGenerating] = useState(false);
  const [selectedCopied, setSelectedCopied] = useState(false);
  // Track which email cards have inline drafts open
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [p1Res, p2Res, p3Res, noiseRes] = await Promise.all([
        addonFetch("/api/emails?priority=p1&limit=20"),
        addonFetch("/api/emails?priority=p2&limit=10"),
        addonFetch("/api/emails?priority=p3&page=1&limit=1"),
        addonFetch("/api/emails?priority=noise&page=1&limit=1"),
      ]);
      const [p1, p2, p3, noise] = await Promise.all([p1Res.json(), p2Res.json(), p3Res.json(), noiseRes.json()]);
      setCounts({ p1: p1.total || 0, p2: p2.total || 0, p3: p3.total || 0, noise: noise.total || 0 });
      setP1Emails(p1.emails || []);
      setP2Emails(p2.emails || []);
    } catch {}
    setOverviewLoading(false);
  }, []);

  const lookupSelected = useCallback(async (subj: string) => {
    if (!subj) return;
    setSelectedLoading(true);
    setSelectedEmail(null); setSelectedDraft(null); setSelectedDraftText("");
    try {
      const res = await addonFetch(`/api/emails?search=${encodeURIComponent(subj)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.emails?.length > 0) {
          setSelectedEmail(data.emails[0]);
          const dRes = await addonFetch(`/api/drafts/${data.emails[0].message_id}`);
          if (dRes.ok) {
            const d = await dRes.json();
            if (d.draft) { setSelectedDraft(d.draft); setSelectedDraftText(d.draft.edited_body || d.draft.draft_body); }
          }
        }
      }
    } catch {}
    setSelectedLoading(false);
  }, []);

  useEffect(() => {
    const initOffice = () => {
      const Office = (window as any).Office;
      if (Office) {
        Office.onReady(() => {
          setReady(true); fetchOverview();
          const item = Office.context?.mailbox?.item;
          if (item) { setSelectedSubject(item.subject || ""); lookupSelected(item.subject || ""); }
          try {
            Office.context?.mailbox?.addHandlerAsync(Office.EventType.ItemChanged, () => {
              const newItem = Office.context?.mailbox?.item;
              if (newItem) { setSelectedSubject(newItem.subject || ""); lookupSelected(newItem.subject || ""); setTab("selected"); }
            });
          } catch {}
        });
      } else { setReady(true); fetchOverview(); }
    };
    if (!(window as any).Office && !document.querySelector('script[src*="office.js"]')) {
      const s = document.createElement("script"); s.src = "https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"; document.head.appendChild(s);
    }
    let attempts = 0;
    const check = () => { attempts++; if ((window as any).Office) initOffice(); else if (attempts < 20) setTimeout(check, 500); else { setReady(true); fetchOverview(); } };
    check();
  }, [fetchOverview, lookupSelected]);

  function toggleDraft(messageId: string) {
    setExpandedDrafts(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  async function generateSelectedDraft() {
    if (!selectedEmail) return;
    setSelectedDraftGenerating(true);
    try {
      const res = await addonFetch("/api/drafts/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selectedEmail.message_id }),
      });
      if (res.ok) { const d = await res.json(); setSelectedDraft(d.draft); setSelectedDraftText(d.draft.draft_body); }
    } catch {}
    setSelectedDraftGenerating(false);
  }

  async function copySelectedDraft() {
    if (!selectedDraftText.trim()) return;
    try { await navigator.clipboard.writeText(selectedDraftText); setSelectedCopied(true); setTimeout(() => setSelectedCopied(false), 2000); } catch {}
  }

  // Pearl & Graphite theme
  const bg = "#f7f7f9"; const surface = "#ffffff"; const headerBg = "#eeeef2";
  const border = "#e0e0e8"; const accent = "#a88830"; const accentHover = "#886810";
  const textP = "#1a1a2e"; const textS = "#5a5a72"; const textM = "#9898b0";

  if (!ready) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
        <Loader2 size={20} color={accent} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  function formatTime(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  // Render an email card with "Open" and "Draft" actions
  function EmailCard({ email, showSummary = true }: { email: EmailData; showSummary?: boolean }) {
    const hasDraftOpen = expandedDrafts.has(email.message_id);
    return (
      <div style={{ padding: "10px 12px", marginBottom: 6, background: surface, borderRadius: 8, border: `0.5px solid ${border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: textP, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>
            {email.sender?.split("@")[0]}
          </span>
          <span style={{ fontSize: 11, color: textM }}>{formatTime(email.received_at)}</span>
        </div>
        <p style={{ fontSize: 13, color: textS, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {email.subject}
        </p>
        {showSummary && email.summary && (
          <p style={{ fontSize: 12, color: textM, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email.summary}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => openInOutlook(email)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, fontWeight: 500,
              background: accent, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
            <Mail size={12} /> Open
          </button>
          <button onClick={() => toggleDraft(email.message_id)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, fontWeight: 500,
              background: hasDraftOpen ? "#eef0f6" : "rgba(168,136,48,0.08)", color: hasDraftOpen ? textS : accent,
              border: `0.5px solid ${hasDraftOpen ? "#cacad8" : "rgba(168,136,48,0.15)"}`, borderRadius: 5, cursor: "pointer" }}>
            <Sparkles size={12} /> {hasDraftOpen ? "Hide Draft" : "AI Draft"}
          </button>
        </div>

        {/* Inline draft */}
        {hasDraftOpen && (
          <InlineDraft messageId={email.message_id} onClose={() => toggleDraft(email.message_id)} />
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, fontFamily: "system-ui, -apple-system, sans-serif", color: textP }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${border}`, background: headerBg, flexShrink: 0 }}>
        <button onClick={() => setTab("overview")}
          style={{ flex: 1, padding: "12px 8px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
            background: "transparent", color: tab === "overview" ? accent : textM,
            borderBottom: tab === "overview" ? `2px solid ${accent}` : "2px solid transparent" }}>
          Inbox Overview
        </button>
        <button onClick={() => setTab("selected")}
          style={{ flex: 1, padding: "12px 8px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
            background: "transparent", color: tab === "selected" ? accent : textM,
            borderBottom: tab === "selected" ? `2px solid ${accent}` : "2px solid transparent" }}>
          Selected Email
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "overview" ? (
          <>
            {/* Priority counts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12 }}>
              {(["p1", "p2", "p3", "noise"] as Priority[]).map(p => {
                const c = P_CONFIG[p];
                const Icon = c.icon;
                return (
                  <div key={p} style={{ background: surface, borderRadius: 8, padding: "10px 12px", border: `0.5px solid ${border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Icon size={14} color={c.color} />
                      <span style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>{c.label}</span>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 600, color: textP }}>{counts[p]}</span>
                  </div>
                );
              })}
            </div>

            {/* P1 queue */}
            <div style={{ padding: "4px 12px 8px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#9a2828", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Needs Action ({counts.p1})
              </p>
              {overviewLoading ? (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <Loader2 size={16} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : p1Emails.length === 0 ? (
                <p style={{ fontSize: 13, color: textM, textAlign: "center", padding: 16 }}>All clear!</p>
              ) : (
                p1Emails.map(email => <EmailCard key={email.id} email={email} />)
              )}
            </div>

            {/* P2 preview */}
            {p2Emails.length > 0 && (
              <div style={{ padding: "4px 12px 12px" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#8a5a10", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  High Priority ({counts.p2})
                </p>
                {p2Emails.slice(0, 5).map(email => <EmailCard key={email.id} email={email} showSummary={false} />)}
              </div>
            )}

            {/* Dashboard link */}
            <div style={{ padding: "8px 12px 16px" }}>
              <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px",
                  background: "rgba(168,136,48,0.08)", border: `0.5px solid rgba(168,136,48,0.15)`, borderRadius: 6,
                  color: accent, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                <ExternalLink size={14} /> Open Full Dashboard
              </a>
            </div>
          </>
        ) : (
          /* Selected email tab */
          <>
            {selectedLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 size={16} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: 13, color: textM, marginTop: 8 }}>Looking up...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : !selectedEmail ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 14, color: textS, marginBottom: 4 }}>
                  {selectedSubject ? "Not triaged yet" : "Select an email"}
                </p>
                <p style={{ fontSize: 12, color: textM }}>
                  {selectedSubject ? "This email hasn't been classified." : "Click on an email in Outlook to see AI triage."}
                </p>
              </div>
            ) : (
              <>
                {/* Selected email header */}
                <div style={{ padding: "14px 14px 12px", borderBottom: `0.5px solid ${border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 4,
                      background: P_CONFIG[selectedEmail.priority].bg, color: P_CONFIG[selectedEmail.priority].color }}>
                      {P_CONFIG[selectedEmail.priority].label}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px", color: textP, lineHeight: 1.4 }}>
                    {selectedEmail.subject}
                  </h3>
                  <p style={{ fontSize: 13, color: textM, margin: 0 }}>{selectedEmail.sender}</p>

                  {/* Open in Outlook button */}
                  <button onClick={() => openInOutlook(selectedEmail)}
                    style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                      background: accent, color: "#fff", fontSize: 13, fontWeight: 500,
                      border: "none", borderRadius: 6, cursor: "pointer" }}>
                    <Mail size={14} /> Open in Outlook
                  </button>
                </div>

                {/* AI Summary */}
                {selectedEmail.summary && (
                  <div style={{ padding: 14, borderBottom: `0.5px solid ${border}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 6px" }}>AI Summary</p>
                    <p style={{ fontSize: 14, color: textP, lineHeight: 1.6, margin: 0 }}>{selectedEmail.summary}</p>
                  </div>
                )}

                {/* AI Draft */}
                <div style={{ padding: 14, borderBottom: `0.5px solid ${border}` }}>
                  {selectedDraftGenerating ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                      <Loader2 size={14} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 13, color: textM }}>Generating...</span>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : selectedDraft ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Sparkles size={14} color={accent} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Draft</span>
                      </div>
                      <textarea value={selectedDraftText} onChange={(e) => setSelectedDraftText(e.target.value)}
                        spellCheck={true} rows={5}
                        style={{ width: "100%", boxSizing: "border-box", background: bg, border: `0.5px solid ${border}`,
                          borderRadius: 6, padding: 10, fontSize: 14, color: textP, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: "inherit" }} />
                      <button onClick={copySelectedDraft} disabled={!selectedDraftText.trim()}
                        style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          gap: 6, padding: "9px 12px", background: accent, color: "#fff", fontSize: 13, fontWeight: 500,
                          border: "none", borderRadius: 6, cursor: "pointer", opacity: selectedDraftText.trim() ? 1 : 0.4 }}>
                        {selectedCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                        {selectedCopied ? "Copied! Paste in Outlook" : "Copy Draft to Clipboard"}
                      </button>
                    </>
                  ) : (
                    <button onClick={generateSelectedDraft}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 8, padding: "9px 12px", background: "rgba(168,136,48,0.08)", color: accent,
                        fontSize: 13, border: `0.5px solid rgba(168,136,48,0.15)`, borderRadius: 6, cursor: "pointer" }}>
                      <Sparkles size={14} /> Generate Draft Reply
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
