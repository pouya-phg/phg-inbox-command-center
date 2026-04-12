"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, CheckSquare, Square, CheckCircle } from "lucide-react";
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
    p1: 0,
    p2: 0,
    p3: 0,
    noise: 0,
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

  // Keyboard navigation
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
      prev.map((e) =>
        e.message_id === messageId ? { ...e, is_read: true } : e
      )
    );
  }

  async function handleBulkMarkRead() {
    if (selectedIds.size === 0) return;
    setBulkActioning(true);
    const ids = Array.from(selectedIds);
    await fetch("/api/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: ids }),
    });
    setEmails((prev) =>
      prev.map((e) =>
        selectedIds.has(e.message_id) ? { ...e, is_read: true } : e
      )
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
    if (activeTab === "noise") {
      setEmails((prev) => prev.map((e) => ({ ...e, is_read: true })));
    }
    setSelectedIds(new Set());
    fetchCounts();
    setMarkingAll(false);
  }

  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const someSelected = selectedIds.size > 0;
  const unreadSelected = emails.filter(
    (e) => selectedIds.has(e.message_id) && !e.is_read
  ).length;

  return (
    <div className="min-h-screen bg-[#080f0d]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-medium text-[#f0ece4] tracking-[-0.01em]">
              Inbox Command Center
            </h1>
            <p className="text-sm text-[#6e6858] mt-0.5">
              AI-powered email triage
            </p>
          </div>
          <a
            href="/rules"
            className="text-sm text-[#c8a040] hover:text-[#a88030] font-medium transition-colors"
          >
            Manage Rules →
          </a>
        </div>

        {/* Sync Controls */}
        <div className="mb-6 p-4 bg-[#0f1a16] border-[0.5px] border-[#1e3028] rounded-[10px]">
          <SyncControls />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-[#1e3028]">
          {TABS.map((tab) => {
            const tabConfig = PRIORITY_CONFIG[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setActiveEmail(null);
                }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-[#c8a040] text-[#c8a040]"
                    : "border-transparent text-[rgba(255,255,255,0.45)] hover:text-[#b0a890]"
                }`}
              >
                {tabConfig.label}
                <span
                  className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-[rgba(200,160,64,0.15)] text-[#c8a040]"
                      : "bg-[rgba(255,255,255,0.06)] text-[#6e6858]"
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selection toolbar */}
        {!loading && emails.length > 0 && (
          <div className="mb-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-[#b0a890] hover:text-[#f0ece4] transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-[#c8a040]" />
              ) : (
                <Square className="w-4 h-4 text-[#6e6858]" />
              )}
              {allSelected ? "Deselect all" : "Select all"}
            </button>

            {someSelected && (
              <span className="text-sm text-[#c8a040] font-medium">
                {selectedIds.size} selected
              </span>
            )}

            {someSelected && unreadSelected > 0 && (
              <button
                onClick={handleBulkMarkRead}
                disabled={bulkActioning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(96,200,128,0.12)] text-[#60c880] text-sm font-medium rounded-md border-[0.5px] border-[rgba(96,200,128,0.25)] hover:bg-[rgba(96,200,128,0.20)] disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {bulkActioning ? "Marking..." : `Mark ${unreadSelected} as read`}
              </button>
            )}

            {activeTab === "noise" && counts.noise > 0 && (
              <button
                onClick={handleMarkAllNoiseRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(192,104,88,0.12)] text-[#c06858] text-sm font-medium rounded-md border-[0.5px] border-[rgba(192,104,88,0.25)] hover:bg-[rgba(192,104,88,0.20)] disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {markingAll ? "Marking all..." : `Mark all ${counts.noise} noise as read`}
              </button>
            )}

            {activeEmail && (
              <span className="ml-auto text-[10px] text-[#6e6858] hidden lg:block">
                J/K or arrows to navigate
              </span>
            )}
          </div>
        )}

        {/* Email list */}
        {loading ? (
          <div className="text-center py-16 text-[#6e6858]">
            <div className="inline-block w-6 h-6 border-2 border-[#264038] border-t-[#c8a040] rounded-full animate-spin mb-3" />
            <p>Loading emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-16 text-[#6e6858]">
            No emails in this category
          </div>
        ) : (
          <div className="space-y-1.5">
            {emails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                selected={selectedIds.has(email.message_id)}
                isActive={activeEmail?.message_id === email.message_id}
                onToggleSelect={toggleSelect}
                onMarkRead={handleMarkRead}
                onOpen={setActiveEmail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Email detail panel */}
      {activeEmail && (
        <EmailPanel
          messageId={activeEmail.message_id}
          priority={activeEmail.priority}
          summary={activeEmail.summary}
          onClose={() => setActiveEmail(null)}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}
