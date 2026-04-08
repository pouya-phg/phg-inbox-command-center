"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SyncState } from "@/types";

export default function SyncControls() {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchSyncState();
  }, []);

  async function fetchSyncState() {
    const res = await fetch("/api/sync-settings");
    if (res.ok) {
      setSyncState(await res.json());
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      // Wait a moment then refresh state
      setTimeout(fetchSyncState, 3000);
    } finally {
      setSyncing(false);
    }
  }

  async function toggleNightlySync() {
    if (!syncState) return;
    setToggling(true);
    try {
      await fetch("/api/sync-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nightly_sync_enabled: !syncState.nightly_sync_enabled,
        }),
      });
      setSyncState({
        ...syncState,
        nightly_sync_enabled: !syncState.nightly_sync_enabled,
      });
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Sync status */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        {syncState?.last_synced_at ? (
          <span>
            Last synced{" "}
            {formatDistanceToNow(new Date(syncState.last_synced_at), {
              addSuffix: true,
            })}{" "}
            | {syncState.total_processed} emails processed
          </span>
        ) : (
          <span>Never synced</span>
        )}
      </div>

      {/* Nightly toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="text-sm text-gray-600">Nightly auto-sync</span>
        <button
          onClick={toggleNightlySync}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            syncState?.nightly_sync_enabled ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              syncState?.nightly_sync_enabled
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </label>

      {/* Sync now button */}
      <button
        onClick={triggerSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}
