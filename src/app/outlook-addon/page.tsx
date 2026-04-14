"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Copy, CheckCircle, RotateCw, Trash2, Loader2, ExternalLink, ChevronRight, Inbox, AlertCircle, Bell, VolumeX } from "lucide-react";

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
interface DraftData {
  draft_body: string;
  edited_body: string | null;
  doc_context: string | null;
}

const API_BASE = "";
const ADDON_KEY = process.env.NEXT_PUBLIC_ADDON_API_KEY || "";

function addonFetch(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  headers.set("x-addon-key", ADDON_KEY);
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

const P_CONFIG: Record<Priority, { label: string; icon: any; color: string; bg: string }> = {
  p1: { label: "Needs Action", icon: AlertCircle, color: "#b48a46", bg: "rgba(180,138,70,0.16)" },
  p2: { label: "High Priority", icon: Bell, color: "#a07840", bg: "#1a1208" },
  p3: { label: "Informational", icon: Inbox, color: "#707880", bg: "rgba(255,255,255,0.05)" },
  noise: { label: "Noise", icon: VolumeX, color: "#505860", bg: "rgba(255,255,255,0.04)" },
};

type Tab = "overview" | "selected";

export default function OutlookAddonPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  // Overview state
  const [counts, setCounts] = useState<Record<Priority, number>>({ p1: 0, p2: 0, p3: 0, noise: 0 });
  const [p1Emails, setP1Emails] = useState<EmailData[]>([]);
  const [p2Emails, setP2Emails] = useState<EmailData[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Selected email state
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch overview data
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

  // Look up selected email
  const lookupSelected = useCallback(async (subj: string) => {
    if (!subj) return;
    setSelectedLoading(true);
    setSelectedEmail(null);
    setDraft(null);
    try {
      const res = await addonFetch(`/api/emails?search=${encodeURIComponent(subj)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.emails?.length > 0) {
          setSelectedEmail(data.emails[0]);
          // Fetch draft
          const dRes = await addonFetch(`/api/drafts/${data.emails[0].message_id}`);
          if (dRes.ok) {
            const d = await dRes.json();
            if (d.draft) { setDraft(d.draft); setDraftText(d.draft.edited_body || d.draft.draft_body); }
          }
        }
      }
    } catch {}
    setSelectedLoading(false);
  }, []);

  // Init Office.js
  useEffect(() => {
    const initOffice = () => {
      const Office = (window as any).Office;
      if (Office) {
        Office.onReady(() => {
          setReady(true);
          fetchOverview();
          const item = Office.context?.mailbox?.item;
          if (item) {
            setSelectedSubject(item.subject || "");
            lookupSelected(item.subject || "");
          }
          try {
            Office.context?.mailbox?.addHandlerAsync(Office.EventType.ItemChanged, () => {
              const newItem = Office.context?.mailbox?.item;
              if (newItem) {
                setSelectedSubject(newItem.subject || "");
                setSelectedEmail(null); setDraft(null); setDraftText("");
                lookupSelected(newItem.subject || "");
                setTab("selected");
              }
            });
          } catch {}
        });
      } else {
        setReady(true);
        fetchOverview();
      }
    };

    if (!(window as any).Office && !document.querySelector('script[src*="office.js"]')) {
      const s = document.createElement("script");
      s.src = "https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js";
      document.head.appendChild(s);
    }

    let attempts = 0;
    const check = () => {
      attempts++;
      if ((window as any).Office) initOffice();
      else if (attempts < 20) setTimeout(check, 500);
      else { setReady(true); fetchOverview(); }
    };
    check();
  }, [fetchOverview, lookupSelected]);

  async function generateDraft() {
    if (!selectedEmail) return;
    setDraftGenerating(true);
    try {
      const res = await addonFetch("/api/drafts/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selectedEmail.message_id }),
      });
      if (res.ok) { const d = await res.json(); setDraft(d.draft); setDraftText(d.draft.draft_body); }
    } catch {}
    setDraftGenerating(false);
  }

  async function copyDraft() {
    if (!draftText.trim()) return;
    try { await navigator.clipboard.writeText(draftText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  async function discardDraft() {
    if (!selectedEmail) return;
    await addonFetch(`/api/drafts/${selectedEmail.message_id}`, { method: "DELETE" });
    setDraft(null); setDraftText("");
  }

  // Styles
  const bg = "#0c1014"; const surface = "#141a20"; const headerBg = "#10161c";
  const border = "#1e242a"; const accent = "#b48a46"; const accentHover = "#906830";
  const textP = "#d0d4d8"; const textS = "#8a9098"; const textM = "#606870";

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
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, fontFamily: "system-ui, -apple-system, sans-serif", color: textP }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${border}`, background: headerBg, flexShrink: 0 }}>
        <button onClick={() => setTab("overview")}
          style={{ flex: 1, padding: "10px 8px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
            background: "transparent", color: tab === "overview" ? accent : textM,
            borderBottom: tab === "overview" ? `2px solid ${accent}` : "2px solid transparent" }}>
          Inbox Overview
        </button>
        <button onClick={() => setTab("selected")}
          style={{ flex: 1, padding: "10px 8px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
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
                      <Icon size={12} color={c.color} />
                      <span style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{c.label}</span>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 600, color: textP }}>{counts[p]}</span>
                  </div>
                );
              })}
            </div>

            {/* P1 queue */}
            <div style={{ padding: "4px 12px 8px" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Needs Action ({counts.p1})
              </p>
              {overviewLoading ? (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <Loader2 size={16} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : p1Emails.length === 0 ? (
                <p style={{ fontSize: 11, color: textM, textAlign: "center", padding: 16 }}>All clear!</p>
              ) : (
                p1Emails.map(email => (
                  <div key={email.id}
                    onClick={() => { if (email.web_link) window.open(email.web_link, "_blank"); }}
                    style={{ padding: "8px 10px", marginBottom: 4, background: surface, borderRadius: 6, border: `0.5px solid ${border}`, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: textP, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                        {email.sender?.split("@")[0]}
                      </span>
                      <span style={{ fontSize: 9, color: textM }}>{formatTime(email.received_at)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: textS, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {email.subject}
                    </p>
                    {email.summary && (
                      <p style={{ fontSize: 10, color: textM, margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {email.summary}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* P2 preview */}
            {p2Emails.length > 0 && (
              <div style={{ padding: "4px 12px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#a07840", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  High Priority ({counts.p2})
                </p>
                {p2Emails.slice(0, 5).map(email => (
                  <div key={email.id}
                    onClick={() => { if (email.web_link) window.open(email.web_link, "_blank"); }}
                    style={{ padding: "6px 10px", marginBottom: 3, background: surface, borderRadius: 6, border: `0.5px solid ${border}`, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: textS, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{email.subject}</span>
                      <span style={{ fontSize: 9, color: textM }}>{formatTime(email.received_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dashboard link */}
            <div style={{ padding: "8px 12px 16px" }}>
              <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px",
                  background: "rgba(180,138,70,0.08)", border: `0.5px solid rgba(180,138,70,0.20)`, borderRadius: 6,
                  color: accent, fontSize: 11, textDecoration: "none", fontWeight: 500 }}>
                <ExternalLink size={12} /> Open Full Dashboard
              </a>
            </div>
          </>
        ) : (
          /* Selected email tab */
          <>
            {selectedLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 size={16} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: 11, color: textM, marginTop: 8 }}>Looking up...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : !selectedEmail ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 12, color: textS, marginBottom: 4 }}>
                  {selectedSubject ? "Not triaged yet" : "Select an email"}
                </p>
                <p style={{ fontSize: 10, color: textM }}>
                  {selectedSubject ? "This email hasn't been classified." : "Click on an email in Outlook to see AI triage."}
                </p>
              </div>
            ) : (
              <>
                {/* Selected email header */}
                <div style={{ padding: 12, borderBottom: `0.5px solid ${border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: P_CONFIG[selectedEmail.priority].bg, color: P_CONFIG[selectedEmail.priority].color }}>
                      {P_CONFIG[selectedEmail.priority].label}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 500, margin: "0 0 4px", color: textP, lineHeight: 1.4 }}>
                    {selectedEmail.subject}
                  </h3>
                  <p style={{ fontSize: 11, color: textM, margin: 0 }}>{selectedEmail.sender}</p>
                </div>

                {/* AI Summary */}
                {selectedEmail.summary && (
                  <div style={{ padding: 12, borderBottom: `0.5px solid ${border}` }}>
                    <p style={{ fontSize: 9, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 4px" }}>AI Summary</p>
                    <p style={{ fontSize: 12, color: textP, lineHeight: 1.6, margin: 0 }}>{selectedEmail.summary}</p>
                  </div>
                )}

                {/* AI Draft */}
                <div style={{ padding: 12, borderBottom: `0.5px solid ${border}` }}>
                  {draftGenerating ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                      <Loader2 size={14} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 11, color: textM }}>Generating...</span>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : draft ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Sparkles size={12} color={accent} />
                          <span style={{ fontSize: 9, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Draft</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={generateDraft} style={{ background: "none", border: "none", cursor: "pointer", color: textM, padding: 2 }}><RotateCw size={10} /></button>
                          <button onClick={discardDraft} style={{ background: "none", border: "none", cursor: "pointer", color: textM, padding: 2 }}><Trash2 size={10} /></button>
                        </div>
                      </div>
                      <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)}
                        spellCheck={true} rows={5}
                        style={{ width: "100%", boxSizing: "border-box", background: bg, border: `0.5px solid ${border}`,
                          borderRadius: 6, padding: 8, fontSize: 12, color: textP, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: "inherit" }} />
                      <button onClick={copyDraft} disabled={!draftText.trim()}
                        style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          gap: 6, padding: "8px 12px", background: accent, color: "#fff", fontSize: 12, fontWeight: 500,
                          border: "none", borderRadius: 6, cursor: "pointer", opacity: draftText.trim() ? 1 : 0.4 }}>
                        {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                        {copied ? "Copied! Paste in Outlook" : "Copy Draft to Clipboard"}
                      </button>
                    </>
                  ) : (
                    <button onClick={generateDraft}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 8, padding: "8px 12px", background: "rgba(180,138,70,0.08)", color: accent,
                        fontSize: 12, border: `0.5px solid rgba(180,138,70,0.20)`, borderRadius: 6, cursor: "pointer" }}>
                      <Sparkles size={14} /> Generate Draft Reply
                    </button>
                  )}
                </div>

                {/* Open in Outlook */}
                {selectedEmail.web_link && (
                  <div style={{ padding: 12 }}>
                    <a href={selectedEmail.web_link} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: textM, textDecoration: "none" }}>
                      <ExternalLink size={12} /> Open in Outlook Web
                    </a>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
