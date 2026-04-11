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
      <div className="flex items-center gap-2 text-sm text-[#b0a890]">
        <Clock className="w-4 h-4 text-[#6e6858]" />
        {syncState?.last_synced_at ? (
          <span>
            Last synced{" "}
            {formatDistanceToNow(new Date(syncState.last_synced_at), {
              addSuffix: true,
            })}{" "}
            <span className="text-[#6e6858]">|</span>{" "}
            <span className="text-[#c8a040] font-medium">
              {syncState.total_processed}
            </span>{" "}
            emails processed
          </span>
        ) : (
          <span>Never synced</span>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <span className="text-sm text-[#b0a890]">Nightly auto-sync</span>
        <button
          onClick={toggleNightlySync}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            syncState?.nightly_sync_enabled
              ? "bg-[#c8a040]"
              : "bg-[#264038]"
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

      <button
        onClick={triggerSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#c8a040] text-white text-sm font-medium rounded-md hover:bg-[#a88030] disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}
