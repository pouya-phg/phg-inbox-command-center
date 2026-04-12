"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SyncState } from "@/types";

export default function SyncControls() {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { fetchSyncState(); }, []);

  async function fetchSyncState() {
    const res = await fetch("/api/sync-settings");
    if (res.ok) setSyncState(await res.json());
  }

  async function triggerSync() {
    setSyncing(true);
    try { await fetch("/api/sync", { method: "POST" }); setTimeout(fetchSyncState, 3000); }
    finally { setSyncing(false); }
  }

  async function toggleNightlySync() {
    if (!syncState) return;
    setToggling(true);
    try {
      await fetch("/api/sync-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nightly_sync_enabled: !syncState.nightly_sync_enabled }) });
      setSyncState({ ...syncState, nightly_sync_enabled: !syncState.nightly_sync_enabled });
    } finally { setToggling(false); }
  }

  return (
    <div className="flex items-center gap-4 text-[9px]">
      <span className="text-[#505860]">
        {syncState?.last_synced_at ? `Synced ${formatDistanceToNow(new Date(syncState.last_synced_at), { addSuffix: true })}` : "Never synced"}
      </span>
      <span className="text-[#1c2226]">|</span>
      <span className="text-[#8a9098]">{syncState?.total_processed || 0} emails</span>
      <span className="text-[#1c2226]">|</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <span className="text-[#8a9098]">Auto</span>
        <button onClick={toggleNightlySync} disabled={toggling}
          className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${syncState?.nightly_sync_enabled ? "bg-[#b48a46]" : "bg-[#1c2226]"}`}>
          <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${syncState?.nightly_sync_enabled ? "translate-x-3" : "translate-x-0.5"}`} />
        </button>
      </label>
      <button onClick={triggerSync} disabled={syncing}
        className="flex items-center gap-1 px-2 py-1 text-[rgba(200,204,208,0.45)] bg-[rgba(255,255,255,0.04)] border-[0.5px] border-[#1c2226] rounded transition-colors hover:text-[#c8ccd0] disabled:opacity-50">
        <RefreshCw className={`w-2.5 h-2.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing" : "Sync"}
      </button>
    </div>
  );
}
