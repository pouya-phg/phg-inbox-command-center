"use client";

import { useEffect, useState } from "react";
import AddonPanel from "@/components/AddonPanel";

declare global {
  interface Window {
    Office?: any;
  }
}

export default function OutlookAddonPage() {
  const [itemId, setItemId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Office.js
    if (typeof window !== "undefined" && window.Office) {
      window.Office.onReady((info: any) => {
        if (info.host === "Outlook" || info.host === undefined) {
          setReady(true);
          readSelectedItem();
          // Listen for item changes
          if (window.Office.context?.mailbox) {
            window.Office.context.mailbox.addHandlerAsync(
              window.Office.EventType.ItemChanged,
              () => readSelectedItem()
            );
          }
        } else {
          setError("This add-in only works in Outlook");
        }
      });
    } else {
      // Not running inside Office — show standalone mode
      setReady(true);
      setError("Not running inside Outlook. Open this in the Outlook add-in sidebar.");
    }
  }, []);

  function readSelectedItem() {
    try {
      const item = window.Office?.context?.mailbox?.item;
      if (!item) {
        setItemId(null);
        setSubject("");
        return;
      }
      // Get the Exchange Web Services item ID
      setItemId(item.itemId || null);
      setSubject(item.subject || "");
    } catch (e) {
      setError("Failed to read email");
    }
  }

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-[var(--border-mid)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[12px] text-[var(--text-muted)]">Loading add-in...</p>
        </div>
      </div>
    );
  }

  if (error && !itemId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[13px] text-[var(--text-muted)] mb-2">{error}</p>
          <a href="https://phg-inbox-command-center.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)]">
            Open Dashboard →
          </a>
        </div>
      </div>
    );
  }

  return <AddonPanel itemId={itemId} subject={subject} />;
}
