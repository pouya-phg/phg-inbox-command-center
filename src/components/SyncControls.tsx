"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
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
    if (res.ok) setSyncState(await res.json());
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
      setSyncState({ ...syncState, nightly_sync_enabled: !syncState.nightly_sync_enabled });
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex items-center gap-4 text-[12px]">
      <span className="text-[#9898b0]">
        {syncState?.last_synced_at
          ? `Synced ${formatDistanceToNow(new Date(syncState.last_synced_at), { addSuffix: true })}`
          : "Never synced"}
      </span>
      <span className="text-[#cacad8]">|</span>
      <span className="text-[#5a5a72] font-medium">
        {syncState?.total_processed || 0} emails
      </span>
      <span className="text-[#cacad8]">|</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <span className="text-[#9898b0]">Auto</span>
        <button
          onClick={toggleNightlySync}
          disabled={toggling}
          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
            syncState?.nightly_sync_enabled ? "bg-[#8090a8]" : "bg-[#cacad8]"
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              syncState?.nightly_sync_enabled ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
      <button
        onClick={triggerSync}
        disabled={syncing}
        className="flex items-center gap-1 px-2 py-1 text-[#607088] hover:text-[#1a1a2e] hover:bg-[#eef0f6] rounded transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing" : "Sync"}
      </button>
    </div>
  );
}
