"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, CheckSquare, Square, CheckCircle } from "lucide-react";
import type { Email, Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";
import EmailCard from "./EmailCard";
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

  function toggleSelect(messageId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.message_id)));
    }
  }

  async function handleMarkRead(messageId: string) {
    await fetch("/api/mark-read", {
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
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Inbox Command Center
        </h1>
        <a
          href="/rules"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Manage Rules →
        </a>
      </div>

      {/* Sync Controls */}
      <div className="mb-6 p-4 bg-white border rounded-lg">
        <SyncControls />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {PRIORITY_CONFIG[tab].label}
            <span className="ml-1.5 text-xs bg-gray-100 rounded-full px-2 py-0.5">
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Selection toolbar */}
      {!loading && emails.length > 0 && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          {/* Select all checkbox */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          {/* Selection count */}
          {someSelected && (
            <span className="text-sm text-blue-600 font-medium">
              {selectedIds.size} selected
            </span>
          )}

          {/* Bulk actions (shown when items are selected) */}
          {someSelected && unreadSelected > 0 && (
            <button
              onClick={handleBulkMarkRead}
              disabled={bulkActioning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {bulkActioning
                ? "Marking..."
                : `Mark ${unreadSelected} as read`}
            </button>
          )}

          {/* Mark all noise as read (always visible on noise tab) */}
          {activeTab === "noise" && counts.noise > 0 && (
            <button
              onClick={handleMarkAllNoiseRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {markingAll
                ? "Marking all..."
                : `Mark all ${counts.noise} noise as read`}
            </button>
          )}
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Loading emails...
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No emails in this category
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              selected={selectedIds.has(email.message_id)}
              onToggleSelect={toggleSelect}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
