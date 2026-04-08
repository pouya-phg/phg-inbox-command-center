"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
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

  const fetchEmails = useCallback(async (priority: Priority) => {
    setLoading(true);
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
    fetchCounts();
    setMarkingAll(false);
  }

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

      {/* Bulk actions */}
      {activeTab === "noise" && counts.noise > 0 && (
        <div className="mb-4">
          <button
            onClick={handleMarkAllNoiseRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {markingAll
              ? "Marking all as read..."
              : `Mark all ${counts.noise} noise as read`}
          </button>
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading emails...</div>
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
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
