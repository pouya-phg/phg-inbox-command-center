"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, CheckSquare, Square, CheckCircle, Mail, Settings } from "lucide-react";
import type { Email, Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";
import EmailCard from "./EmailCard";
import EmailPanel from "./EmailPanel";
import SyncControls from "./SyncControls";

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
    <div className="h-screen flex overflow-hidden bg-[#080c10]">
      {/* Sidebar — darkest layer */}
      <div className="w-[200px] bg-[#0a0e12] flex flex-col shrink-0 border-r-[0.5px] border-[#1e242a]">
        <div className="px-4 py-5 border-b-[0.5px] border-[#1e242a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[rgba(180,138,70,0.16)] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#b48a46]" />
            </div>
            <span className="text-[14px] font-medium text-[#d0d4d8]">PHG Inbox</span>
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
                    ? "bg-[rgba(180,138,70,0.12)] text-[#b48a46]"
                    : "text-[#606870] hover:text-[#a0a8b0] hover:bg-[rgba(255,255,255,0.03)]"
                }`}>
                <span>{tabConfig.label}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  isActive ? "bg-[rgba(180,138,70,0.18)] text-[#b48a46]" : "bg-[rgba(255,255,255,0.05)] text-[#505860]"
                }`}>{counts[tab]}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-2 pb-4 border-t-[0.5px] border-[#1e242a] pt-3">
          <a href="/rules" className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#606870] hover:text-[#a0a8b0] rounded-md transition-colors">
            <Settings className="w-3.5 h-3.5" /> Rules
          </a>
        </div>
      </div>

      {/* Email list — mid layer */}
      <div className="w-[380px] bg-[#141a20] border-r-[0.5px] border-[#1e242a] flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 bg-[#10161c] border-b-[0.5px] border-[#1e242a]">
          <SyncControls />
        </div>
        <div className="px-4 py-2 border-b-[0.5px] border-[#1e242a] flex items-center gap-2 bg-[#10161c]">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-[12px] text-[#606870] hover:text-[#a0a8b0] transition-colors">
            {allSelected ? <CheckSquare className="w-4 h-4 text-[#b48a46]" /> : <Square className="w-4 h-4" />} All
          </button>
          {someSelected && <span className="text-[12px] text-[#b48a46] font-medium">{selectedIds.size}</span>}
          {someSelected && unreadSelected > 0 && (
            <button onClick={handleBulkMarkRead} disabled={bulkActioning}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-[#4a9868] bg-[#0a1c12] rounded transition-colors disabled:opacity-50">
              <CheckCircle className="w-3 h-3" /> Read
            </button>
          )}
          {activeTab === "noise" && counts.noise > 0 && (
            <button onClick={handleMarkAllNoiseRead} disabled={markingAll}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-[#b06050] bg-[#1c0c0a] rounded transition-colors disabled:opacity-50 ml-auto">
              <Trash2 className="w-3 h-3" /> {markingAll ? "..." : `All ${counts.noise}`}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-5 h-5 border-2 border-[#2a3038] border-t-[#b48a46] rounded-full animate-spin mb-3" />
              <p className="text-[12px] text-[#606870]">Loading...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16 text-[#606870] text-[13px]">No emails here</div>
          ) : (
            emails.map((email) => (
              <EmailCard key={email.id} email={email} selected={selectedIds.has(email.message_id)}
                isActive={activeEmail?.message_id === email.message_id} onToggleSelect={toggleSelect} onOpen={setActiveEmail} />
            ))
          )}
        </div>
      </div>

      {/* Reading pane — lighter than sidebar, distinct from list */}
      <div className="flex-1 flex flex-col bg-[#181e24] overflow-hidden">
        <EmailPanel messageId={activeEmail?.message_id || null} priority={activeEmail?.priority || "p3"}
          summary={activeEmail?.summary || null} onMarkRead={handleMarkRead} />
      </div>
    </div>
  );
}
