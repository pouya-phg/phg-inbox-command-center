"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Copy, CheckCircle, RotateCw, Trash2, Loader2, ExternalLink } from "lucide-react";

// Types inline to keep this self-contained
type Priority = "p1" | "p2" | "p3" | "noise";
interface EmailData {
  message_id: string;
  subject: string;
  sender: string;
  priority: Priority;
  summary: string | null;
}
interface DraftData {
  draft_body: string;
  edited_body: string | null;
  doc_context: string | null;
}

const API_BASE = "https://phg-inbox-command-center.vercel.app";
const ADDON_KEY = process.env.NEXT_PUBLIC_ADDON_API_KEY || "";

function addonFetch(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  headers.set("x-addon-key", ADDON_KEY);
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

const PRIORITY_LABELS: Record<Priority, { label: string; color: string; bg: string }> = {
  p1: { label: "Needs Action", color: "#b48a46", bg: "rgba(180,138,70,0.16)" },
  p2: { label: "High Priority", color: "#a07840", bg: "#1a1208" },
  p3: { label: "Informational", color: "#707880", bg: "rgba(255,255,255,0.05)" },
  noise: { label: "Noise", color: "#505860", bg: "rgba(255,255,255,0.04)" },
};

export default function OutlookAddonPage() {
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupEmail = useCallback(async (subj: string) => {
    if (!subj) return;
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const res = await addonFetch(`/api/emails?search=${encodeURIComponent(subj)}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.emails?.length > 0) {
          setEmail(data.emails[0]);
          // Fetch existing draft
          const dRes = await addonFetch(
            `/api/drafts/${data.emails[0].message_id}`
          );
          if (dRes.ok) {
            const dData = await dRes.json();
            if (dData.draft) {
              setDraft(dData.draft);
              setDraftText(dData.draft.edited_body || dData.draft.draft_body);
            }
          }
        } else {
          setNotFound(true);
        }
      } else {
        setError("Failed to look up email");
      }
    } catch (e) {
      setError("Connection error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initOffice = () => {
      const Office = (window as any).Office;
      if (Office) {
        Office.onReady((info: any) => {
          setReady(true);
          const item = Office.context?.mailbox?.item;
          if (item) {
            setSubject(item.subject || "");
            lookupEmail(item.subject || "");
          }
          try {
            Office.context?.mailbox?.addHandlerAsync(
              Office.EventType.ItemChanged,
              () => {
                const newItem = Office.context?.mailbox?.item;
                if (newItem) {
                  setSubject(newItem.subject || "");
                  setEmail(null);
                  setDraft(null);
                  setDraftText("");
                  lookupEmail(newItem.subject || "");
                }
              }
            );
          } catch {}
        });
      } else {
        // Not inside Office — show standalone mode
        setReady(true);
        setError("Not running inside Outlook. Visit the dashboard instead.");
      }
    };

    // Check if we're inside an Office iframe (Outlook injects Office.js)
    // The script tag in the root layout loads it, but it may take time
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds total

    const checkOffice = () => {
      attempts++;
      if ((window as any).Office) {
        initOffice();
      } else if (attempts < maxAttempts) {
        setTimeout(checkOffice, 500);
      } else {
        // After 15 seconds, assume we're not in Outlook
        setReady(true);
        setError("Not running inside Outlook.");
      }
    };

    // If Office.js isn't already on the page, inject it
    if (!(window as any).Office && !document.querySelector('script[src*="office.js"]')) {
      const script = document.createElement("script");
      script.src = "https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js";
      document.head.appendChild(script);
    }

    // Start polling for Office object
    checkOffice();
  }, [lookupEmail]);

  async function generateDraft() {
    if (!email) return;
    setDraftGenerating(true);
    try {
      const res = await addonFetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: email.message_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft(data.draft);
        setDraftText(data.draft.draft_body);
      }
    } catch {}
    setDraftGenerating(false);
  }

  async function copyDraft() {
    if (!draftText.trim()) return;
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function discardDraft() {
    if (!email) return;
    await addonFetch(`/api/drafts/${email.message_id}`, { method: "DELETE" });
    setDraft(null);
    setDraftText("");
  }

  // Styles
  const bg = "#0c1014";
  const surface = "#141a20";
  const border = "#1e242a";
  const accent = "#b48a46";
  const textP = "#d0d4d8";
  const textS = "#8a9098";
  const textM = "#606870";

  if (!ready) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${border}`, borderTopColor: accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 12, color: textM }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg, padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: textS, marginBottom: 8 }}>{error}</p>
          <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: accent, textDecoration: "none" }}>
            Open Dashboard →
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={20} color={accent} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 12, color: textM, marginTop: 8 }}>Looking up email...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg, padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: textS, marginBottom: 4 }}>Not triaged yet</p>
          <p style={{ fontSize: 11, color: textM, marginBottom: 12 }}>This email hasn&apos;t been classified by AI triage.</p>
          <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: accent, textDecoration: "none" }}>
            Open Dashboard to sync →
          </a>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg, padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: textS }}>Select an email</p>
          <p style={{ fontSize: 11, color: textM }}>Click on an email to see AI triage</p>
        </div>
      </div>
    );
  }

  const pConfig = PRIORITY_LABELS[email.priority];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: textP, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `0.5px solid ${border}`, background: surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: pConfig.bg, color: pConfig.color, letterSpacing: "0.03em" }}>
            {pConfig.label}
          </span>
        </div>
        <h2 style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, margin: "0 0 4px", color: textP }}>
          {email.subject}
        </h2>
        <p style={{ fontSize: 11, color: textM, margin: 0 }}>{email.sender}</p>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* AI Summary */}
        {email.summary && (
          <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${border}` }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 4px" }}>AI Summary</p>
            <p style={{ fontSize: 12, color: textP, lineHeight: 1.6, margin: 0 }}>{email.summary}</p>
          </div>
        )}

        {/* AI Draft */}
        <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${border}` }}>
          {draftGenerating ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
              <Loader2 size={16} color={accent} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 11, color: textM }}>Generating draft...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : draft ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} color={accent} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.10em" }}>AI Draft</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={generateDraft} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: textM, fontSize: 9, display: "flex", alignItems: "center", gap: 2 }}>
                    <RotateCw size={10} />
                  </button>
                  <button onClick={discardDraft} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: textM, fontSize: 9, display: "flex", alignItems: "center", gap: 2 }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                spellCheck={true}
                rows={6}
                style={{
                  width: "100%", boxSizing: "border-box", background: bg, border: `0.5px solid ${border}`,
                  borderRadius: 6, padding: "8px 10px", fontSize: 12, color: textP, lineHeight: 1.6,
                  resize: "none", outline: "none", fontFamily: "inherit",
                }}
              />
              <button onClick={copyDraft} disabled={!draftText.trim()}
                style={{
                  width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "8px 12px", background: accent, color: "#fff", fontSize: 12, fontWeight: 500,
                  border: "none", borderRadius: 6, cursor: "pointer", opacity: draftText.trim() ? 1 : 0.4,
                }}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? "Copied! Paste in Outlook" : "Copy Draft to Clipboard"}
              </button>
            </>
          ) : (
            <button onClick={generateDraft}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "8px 12px", background: "rgba(180,138,70,0.08)", color: accent,
                fontSize: 12, border: `0.5px solid rgba(180,138,70,0.20)`, borderRadius: 6, cursor: "pointer",
              }}>
              <Sparkles size={14} /> Generate Draft Reply
            </button>
          )}
        </div>

        {/* Dashboard link */}
        <div style={{ padding: "12px 16px" }}>
          <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: textM, textDecoration: "none" }}>
            <ExternalLink size={12} /> Open full dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
