"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, CheckCircle, RotateCw, Trash2, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import type { Priority, DraftReply } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

interface AddonPanelProps {
  itemId: string | null;
  subject: string;
}

interface EmailData {
  message_id: string;
  subject: string;
  sender: string;
  priority: Priority;
  summary: string | null;
  category: string | null;
  received_at: string;
}

export default function AddonPanel({ itemId, subject }: AddonPanelProps) {
  const [email, setEmail] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState<DraftReply | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [priority, setPriority] = useState<Priority>("p3");
  const [showReclassify, setShowReclassify] = useState(false);

  useEffect(() => {
    if (itemId) {
      lookupEmail(itemId);
    } else {
      setEmail(null);
      setDraft(null);
      setNotFound(false);
    }
  }, [itemId]);

  async function lookupEmail(id: string) {
    setLoading(true);
    setNotFound(false);
    try {
      // Search Supabase for this email by subject match (itemId from Office.js
      // is the EWS ID, not the Graph ID we store. We match by subject + recent.)
      const res = await fetch(`/api/emails?search=${encodeURIComponent(subject)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.emails?.length > 0) {
          const found = data.emails[0];
          setEmail(found);
          setPriority(found.priority);
          fetchDraft(found.message_id);
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  async function fetchDraft(messageId: string) {
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/drafts/${messageId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.draft) { setDraft(data.draft); setDraftText(data.draft.edited_body || data.draft.draft_body); }
        else { setDraft(null); setDraftText(""); }
      }
    } catch {}
    setDraftLoading(false);
  }

  async function generateDraft() {
    if (!email) return;
    setDraftGenerating(true);
    try {
      const res = await fetch("/api/drafts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: email.message_id }) });
      if (res.ok) { const data = await res.json(); setDraft(data.draft); setDraftText(data.draft.draft_body); }
    } catch {}
    setDraftGenerating(false);
  }

  async function copyDraft() {
    if (!draftText.trim()) return;
    // Save edits first
    if (draft && email) {
      await fetch(`/api/drafts/${email.message_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edited_body: draftText }) });
    }
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function discardDraft() {
    if (!email) return;
    await fetch(`/api/drafts/${email.message_id}`, { method: "DELETE" });
    setDraft(null); setDraftText("");
  }

  async function reclassify(newPriority: Priority) {
    if (!email) return;
    // TODO: Add reclassify API endpoint
    setPriority(newPriority);
    setShowReclassify(false);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin mx-auto mb-2" />
          <p className="text-[12px] text-[var(--text-muted)]">Looking up email...</p>
        </div>
      </div>
    );
  }

  if (!itemId) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[13px] text-[var(--text-secondary)] mb-1">Select an email</p>
          <p className="text-[11px] text-[var(--text-muted)]">Click on an email to see AI triage info</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[13px] text-[var(--text-secondary)] mb-1">Not triaged yet</p>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">This email hasn&apos;t been processed by the AI triage system.</p>
          <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)]">
            Open Dashboard to sync →
          </a>
        </div>
      </div>
    );
  }

  if (!email) return null;

  const config = PRIORITY_CONFIG[priority];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b-[0.5px] border-[var(--border-subtle)] bg-[var(--bg-header)] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded tracking-[0.03em] ${config.badgeStyle}`}>
            {config.label}
          </span>
          <div className="relative">
            <button onClick={() => setShowReclassify(!showReclassify)}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors">
              Reclassify <ChevronDown className="w-3 h-3" />
            </button>
            {showReclassify && (
              <div className="absolute right-0 top-full mt-1 bg-[var(--bg-list)] border-[0.5px] border-[var(--border-mid)] rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                {(["p1", "p2", "p3", "noise"] as Priority[]).map(p => (
                  <button key={p} onClick={() => reclassify(p)}
                    className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[var(--hover-subtle)] transition-colors ${p === priority ? "text-[var(--accent)] font-medium" : "text-[var(--text-secondary)]"}`}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <h2 className="text-[14px] font-medium text-[var(--text-primary)] leading-snug mb-1">
          {email.subject}
        </h2>
        <p className="text-[11px] text-[var(--text-muted)]">{email.sender}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Summary */}
        {email.summary && (
          <div className="px-4 py-3 border-b-[0.5px] border-[var(--border-subtle)]">
            <p className="text-[9px] font-semibold text-[var(--accent)] uppercase tracking-[0.10em] mb-1">AI Summary</p>
            <p className="text-[12px] text-[var(--text-body)] leading-relaxed">{email.summary}</p>
          </div>
        )}

        {/* AI Draft */}
        <div className="px-4 py-3 border-b-[0.5px] border-[var(--border-subtle)]">
          {draftGenerating || draftLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
              <span className="text-[11px] text-[var(--text-muted)]">{draftGenerating ? "Generating..." : "Loading..."}</span>
            </div>
          ) : draft ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="text-[9px] font-semibold text-[var(--accent)] uppercase tracking-[0.10em]">AI Draft</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={generateDraft} className="text-[9px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-0.5">
                    <RotateCw className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={discardDraft} className="text-[9px] text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center gap-0.5">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                rows={5}
                className="w-full bg-[var(--bg-reading)] border-[0.5px] border-[var(--border-mid)] rounded-md px-3 py-2 text-[12px] text-[var(--text-body)] focus:border-[var(--accent)] focus:outline-none resize-none leading-relaxed transition-colors"
              />
              <button onClick={copyDraft} disabled={!draftText.trim()}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-[var(--text-on-accent)] text-[12px] font-medium rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors">
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied! Paste in Outlook" : "Copy Draft to Clipboard"}
              </button>
            </>
          ) : (
            <button onClick={generateDraft}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] text-[var(--accent)] bg-[var(--accent-tint-soft)] border-[0.5px] border-[var(--accent)]/30 rounded-md hover:bg-[var(--accent-tint-med)] transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Generate Draft Reply
            </button>
          )}
        </div>

        {/* Open in Dashboard link */}
        <div className="px-4 py-3">
          <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            <ExternalLink className="w-3 h-3" /> Open full dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
