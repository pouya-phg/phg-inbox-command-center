"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, CheckSquare, Square, CheckCircle, Mail, Settings, Sparkles, Loader2 as Spinner, Database } from "lucide-react";
import type { Email, Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";
import EmailCard from "./EmailCard";
import EmailPanel from "./EmailPanel";
import SyncControls from "./SyncControls";
import ThemeToggle from "./ThemeToggle";
import SignOutButton from "./SignOutButton";

const TABS: Priority[] = ["p1", "p2", "p3", "noise"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Priority>("p1");
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Priority, number>>({ p1: 0, p2: 0, p3: 0, noise: 0 });
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [batchDrafting, setBatchDrafting] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<string | null>(null);

  const fetchEmails = useCallback(async (priority: Priority) => {
    setLoading(true); setSelectedIds(new Set());
    const res = await fetch(`/api/emails?priority=${priority}`);
    if (res.ok) { const data = await res.json(); setEmails(data.emails || []); }
    setLoading(false);
  }, []);

  const fetchCounts = useCallback(async () => {
    const results = await Promise.all(TABS.map(async (p) => {
      const res = await fetch(`/api/emails?priority=${p}&page=1`);
      if (res.ok) { const data = await res.json(); return [p, data.total || 0] as [Priority, number]; }
      return [p, 0] as [Priority, number];
    }));
    setCounts(Object.fromEntries(results) as Record<Priority, number>);
  }, []);

  useEffect(() => { fetchEmails(activeTab); fetchCounts(); }, [activeTab, fetchEmails, fetchCounts]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (!activeEmail) return;
      const idx = emails.findIndex((em) => em.message_id === activeEmail.message_id);
      if ((e.key === "j" || e.key === "ArrowDown") && idx < emails.length - 1) { e.preventDefault(); setActiveEmail(emails[idx + 1]); }
      else if ((e.key === "k" || e.key === "ArrowUp") && idx > 0) { e.preventDefault(); setActiveEmail(emails[idx - 1]); }
      else if (e.key === "Escape") setActiveEmail(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeEmail, emails]);

  function toggleSelect(messageId: string) { setSelectedIds((prev) => { const next = new Set(prev); if (next.has(messageId)) next.delete(messageId); else next.add(messageId); return next; }); }
  function selectAll() { if (selectedIds.size === emails.length) setSelectedIds(new Set()); else setSelectedIds(new Set(emails.map((e) => e.message_id))); }
  function handleMarkRead(messageId: string) { fetch("/api/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIds: [messageId] }) }); setEmails((prev) => prev.map((e) => (e.message_id === messageId ? { ...e, is_read: true } : e))); }
  async function handleBulkMarkRead() { if (selectedIds.size === 0) return; setBulkActioning(true); await fetch("/api/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIds: Array.from(selectedIds) }) }); setEmails((prev) => prev.map((e) => (selectedIds.has(e.message_id) ? { ...e, is_read: true } : e))); setSelectedIds(new Set()); fetchCounts(); setBulkActioning(false); }
  async function handleMarkAllNoiseRead() { setMarkingAll(true); await fetch("/api/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) }); if (activeTab === "noise") setEmails((prev) => prev.map((e) => ({ ...e, is_read: true }))); setSelectedIds(new Set()); fetchCounts(); setMarkingAll(false); }

  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const someSelected = selectedIds.size > 0;
  const unreadSelected = emails.filter((e) => selectedIds.has(e.message_id) && !e.is_read).length;

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-app)]">
      {/* Sidebar — always dark anchor (in both themes) */}
      <div className="sidebar-anchor w-[200px] bg-[#0a0e12] flex flex-col shrink-0 border-r-[0.5px] border-[var(--border-subtle)]">
        <div className="px-4 py-5 border-b-[0.5px] border-[var(--sidebar-divider)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--sidebar-accent-tint-strong)] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[var(--sidebar-accent)]" />
            </div>
            <span className="text-[14px] font-medium text-[var(--sidebar-text)]">PHG Inbox</span>
          </div>
        </div>

        <nav className="flex-1 px-2 pt-3">
          {TABS.map((tab) => {
            const tabConfig = PRIORITY_CONFIG[tab];
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); setActiveEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 mb-1 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--sidebar-accent-tint)] text-[var(--sidebar-accent)]"
                    : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
                }`}>
                <span>{tabConfig.label}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  isActive ? "bg-[var(--sidebar-accent-tint-strong)] text-[var(--sidebar-accent)]" : "bg-[rgba(255,255,255,0.05)] text-[var(--sidebar-text-muted)]"
                }`}>{counts[tab]}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-2 pb-4 border-t-[0.5px] border-[var(--sidebar-divider)] pt-3 space-y-1">
          <button
            onClick={async () => {
              setBatchDrafting(true); setBatchResult(null);
              try {
                const res = await fetch("/api/drafts/batch", { method: "POST" });
                if (res.ok) { const d = await res.json(); setBatchResult(`${d.generated} drafted${d.remaining > 0 ? `, ${d.remaining} remaining` : ""}`); }
              } catch { setBatchResult("Error"); }
              setBatchDrafting(false);
              setTimeout(() => setBatchResult(null), 5000);
            }}
            disabled={batchDrafting}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--sidebar-accent)] hover:bg-[var(--sidebar-accent-tint)] rounded-md transition-colors disabled:opacity-50"
          >
            {batchDrafting ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {batchDrafting ? "Drafting..." : "Draft P1+P2"}
          </button>
          {batchResult && <p className="px-3 text-[10px] text-[var(--sidebar-text-muted)]">{batchResult}</p>}
          <button
            onClick={async () => {
              setIndexing(true); setIndexResult("Starting...");
              try {
                const res = await fetch("/api/index/start", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ folder: "Documents" }),
                });
                if (res.ok) {
                  const d = await res.json();
                  const parts = [];
                  parts.push(`+${d.new_documents} new`);
                  if (d.skipped_already_indexed > 0) parts.push(`${d.skipped_already_indexed} already done`);
                  parts.push(`${d.total_indexed} total`);
                  const summary = parts.join(" · ");
                  setIndexResult(d.has_more ? `${summary} · click to continue` : `${summary} · ✓ complete`);
                } else {
                  setIndexResult("Error — check logs");
                }
              } catch { setIndexResult("Error"); }
              setIndexing(false);
              setTimeout(() => setIndexResult(null), 30000);
            }}
            disabled={indexing}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)] rounded-md transition-colors disabled:opacity-50"
          >
            {indexing ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            {indexing ? "Indexing..." : "Index OneDrive"}
          </button>
          {indexResult && <p className="px-3 text-[10px] text-[var(--sidebar-text-muted)] leading-relaxed">{indexResult}</p>}
          <ThemeToggle />
          <a href="/rules" className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] rounded-md transition-colors">
            <Settings className="w-3.5 h-3.5" /> Rules
          </a>
          <SignOutButton />
        </div>
      </div>

      {/* Email list — mid layer */}
      <div className="w-[380px] bg-[var(--bg-list)] border-r-[0.5px] border-[var(--border-subtle)] flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 bg-[var(--bg-header)] border-b-[0.5px] border-[var(--border-subtle)]">
          <SyncControls />
        </div>
        <div className="px-4 py-2 border-b-[0.5px] border-[var(--border-subtle)] flex items-center gap-2 bg-[var(--bg-header)]">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            {allSelected ? <CheckSquare className="w-4 h-4 text-[var(--accent)]" /> : <Square className="w-4 h-4" />} All
          </button>
          {someSelected && <span className="text-[12px] text-[var(--accent)] font-medium">{selectedIds.size}</span>}
          {someSelected && unreadSelected > 0 && (
            <button onClick={handleBulkMarkRead} disabled={bulkActioning}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-[var(--success)] bg-[var(--success-bg)] rounded transition-colors disabled:opacity-50">
              <CheckCircle className="w-3 h-3" /> Read
            </button>
          )}
          {activeTab === "noise" && counts.noise > 0 && (
            <button onClick={handleMarkAllNoiseRead} disabled={markingAll}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-[var(--danger)] bg-[var(--danger-bg)] rounded transition-colors disabled:opacity-50 ml-auto">
              <Trash2 className="w-3 h-3" /> {markingAll ? "..." : `All ${counts.noise}`}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-5 h-5 border-2 border-[var(--border-mid)] border-t-[var(--accent)] rounded-full animate-spin mb-3" />
              <p className="text-[12px] text-[var(--text-muted)]">Loading...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-[13px]">No emails here</div>
          ) : (
            emails.map((email) => (
              <EmailCard key={email.id} email={email} selected={selectedIds.has(email.message_id)}
                isActive={activeEmail?.message_id === email.message_id} onToggleSelect={toggleSelect} onOpen={setActiveEmail} />
            ))
          )}
        </div>
      </div>

      {/* Reading pane */}
      <div className="flex-1 flex flex-col bg-[var(--bg-reading)] overflow-hidden">
        <EmailPanel messageId={activeEmail?.message_id || null} priority={activeEmail?.priority || "p3"}
          summary={activeEmail?.summary || null} onMarkRead={handleMarkRead} />
      </div>
    </div>
  );
}
