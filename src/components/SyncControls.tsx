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
  async function fetchSyncState() { const res = await fetch("/api/sync-settings"); if (res.ok) setSyncState(await res.json()); }
  async function triggerSync() { setSyncing(true); try { await fetch("/api/sync", { method: "POST" }); setTimeout(fetchSyncState, 3000); } finally { setSyncing(false); } }
  async function toggleNightlySync() { if (!syncState) return; setToggling(true); try { await fetch("/api/sync-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nightly_sync_enabled: !syncState.nightly_sync_enabled }) }); setSyncState({ ...syncState, nightly_sync_enabled: !syncState.nightly_sync_enabled }); } finally { setToggling(false); } }

  return (
    <div className="flex items-center gap-4 text-[12px]">
      <span className="text-[var(--text-muted)]">
        {syncState?.last_synced_at ? `Synced ${formatDistanceToNow(new Date(syncState.last_synced_at), { addSuffix: true })}` : "Never synced"}
      </span>
      <span className="text-[var(--border-mid)]">|</span>
      <span className="text-[var(--text-tertiary)] font-medium">{syncState?.total_processed || 0} emails</span>
      <span className="text-[var(--border-mid)]">|</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <span className="text-[var(--text-tertiary)]">Auto</span>
        <button onClick={toggleNightlySync} disabled={toggling}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${syncState?.nightly_sync_enabled ? "bg-[var(--accent)]" : "bg-[var(--border-mid)]"}`}>
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${syncState?.nightly_sync_enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
        </button>
      </label>
      <button onClick={triggerSync} disabled={syncing}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-[var(--text-tertiary)] bg-[var(--hover-subtle)] border-[0.5px] border-[var(--border-mid)] rounded-md transition-colors hover:text-[var(--text-primary)] disabled:opacity-50">
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing" : "Sync"}
      </button>
    </div>
  );
}
