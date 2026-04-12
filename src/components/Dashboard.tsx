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
  const [counts, setCounts] = useState<Record<Priority, number>>({
    p1: 0, p2: 0, p3: 0, noise: 0,
  });
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);

  const fetchEmails = useCallback(async (priority: Priority) => {
    setLoading(true);
    setSelectedIds(new Set());
    const res = await fetch(`/api/emails?priority=${priority}`);
    if (res.ok) {
      const data = await res.json();
      setEmails(data.emails || []);
    }
    setLoading(false);
  }, []);

  const fetchCounts = useCallback(async () => {
    const results = await Promise.all(
      TABS.map(async (p) => {
        const res = await fetch(`/api/emails?priority=${p}&page=1`);
        if (res.ok) {
          const data = await res.json();
          return [p, data.total || 0] as [Priority, number];
        }
        return [p, 0] as [Priority, number];
      })
    );
    setCounts(Object.fromEntries(results) as Record<Priority, number>);
  }, []);

  useEffect(() => {
    fetchEmails(activeTab);
    fetchCounts();
  }, [activeTab, fetchEmails, fetchCounts]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (!activeEmail) return;
      const idx = emails.findIndex((em) => em.message_id === activeEmail.message_id);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < emails.length - 1) setActiveEmail(emails[idx + 1]);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) setActiveEmail(emails[idx - 1]);
      } else if (e.key === "Escape") {
        setActiveEmail(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeEmail, emails]);

  function toggleSelect(messageId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === emails.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(emails.map((e) => e.message_id)));
  }

  function handleMarkRead(messageId: string) {
    fetch("/api/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: [messageId] }),
    });
    setEmails((prev) =>
      prev.map((e) => (e.message_id === messageId ? { ...e, is_read: true } : e))
    );
  }

  async function handleBulkMarkRead() {
    if (selectedIds.size === 0) return;
    setBulkActioning(true);
    await fetch("/api/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: Array.from(selectedIds) }),
    });
    setEmails((prev) =>
      prev.map((e) => (selectedIds.has(e.message_id) ? { ...e, is_read: true } : e))
    );
    setSelectedIds(new Set());
    fetchCounts();
    setBulkActioning(false);
  }

  async function handleMarkAllNoiseRead() {
    setMarkingAll(true);
    await fetch("/api/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (activeTab === "noise") setEmails((prev) => prev.map((e) => ({ ...e, is_read: true })));
    setSelectedIds(new Set());
    fetchCounts();
    setMarkingAll(false);
  }

  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const someSelected = selectedIds.size > 0;
  const unreadSelected = emails.filter((e) => selectedIds.has(e.message_id) && !e.is_read).length;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar — dark ink anchor */}
      <div className="w-[200px] bg-[#12141a] flex flex-col shrink-0">
        <div className="px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[rgba(128,144,168,0.15)] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#8090a8]" />
            </div>
            <span className="text-[14px] font-medium text-[#e8eaf0]">Inbox</span>
          </div>
        </div>

        <nav className="flex-1 px-2">
          {TABS.map((tab) => {
            const tabConfig = PRIORITY_CONFIG[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 mb-0.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[rgba(128,144,168,0.12)] text-[#e8eaf0] border-l-2 border-l-[#8090a8]"
                    : "text-[rgba(232,234,240,0.45)] hover:text-[rgba(232,234,240,0.7)] hover:bg-[rgba(255,255,255,0.04)] border-l-2 border-l-transparent"
                }`}
              >
                <span>{tabConfig.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-[rgba(128,144,168,0.2)] text-[#8090a8]"
                    : "text-[rgba(232,234,240,0.3)]"
                }`}>
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-2 pb-4">
          <a
            href="/rules"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-[rgba(232,234,240,0.45)] hover:text-[rgba(232,234,240,0.7)] hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Rules
          </a>
        </div>
      </div>

      {/* Email list panel */}
      <div className="w-[380px] bg-white border-r-[0.5px] border-[#e0e0e8] flex flex-col shrink-0 overflow-hidden">
        {/* List header */}
        <div className="px-4 py-3 border-b-[0.5px] border-[#e0e0e8] bg-[#f7f7f9]">
          <SyncControls />
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b-[0.5px] border-[#e0e0e8] flex items-center gap-2 bg-white">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-[11px] text-[#9898b0] hover:text-[#1a1a2e] transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#8090a8]" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            All
          </button>

          {someSelected && (
            <span className="text-[11px] text-[#8090a8] font-medium">
              {selectedIds.size} sel.
            </span>
          )}

          {someSelected && unreadSelected > 0 && (
            <button
              onClick={handleBulkMarkRead}
              disabled={bulkActioning}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-[#1e7a48] bg-[#eaf5ee] rounded transition-colors hover:bg-[#d8ede0] disabled:opacity-50"
            >
              <CheckCircle className="w-3 h-3" />
              Read
            </button>
          )}

          {activeTab === "noise" && counts.noise > 0 && (
            <button
              onClick={handleMarkAllNoiseRead}
              disabled={markingAll}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-[#9a2828] bg-[#faecec] rounded transition-colors hover:bg-[#f5dada] disabled:opacity-50 ml-auto"
            >
              <Trash2 className="w-3 h-3" />
              {markingAll ? "..." : `All ${counts.noise}`}
            </button>
          )}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-5 h-5 border-2 border-[#e0e0e8] border-t-[#8090a8] rounded-full animate-spin mb-2" />
              <p className="text-[12px] text-[#9898b0]">Loading...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16 text-[#9898b0] text-[13px]">
              No emails here
            </div>
          ) : (
            emails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                selected={selectedIds.has(email.message_id)}
                isActive={activeEmail?.message_id === email.message_id}
                onToggleSelect={toggleSelect}
                onOpen={setActiveEmail}
              />
            ))
          )}
        </div>
      </div>

      {/* Email detail panel — permanent, right side */}
      <div className="flex-1 flex flex-col bg-[#f7f7f9] overflow-hidden">
        <EmailPanel
          messageId={activeEmail?.message_id || null}
          priority={activeEmail?.priority || "p3"}
          summary={activeEmail?.summary || null}
          onMarkRead={handleMarkRead}
        />
      </div>
    </div>
  );
}
