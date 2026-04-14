"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, CheckCircle, Trash2, Eye, EyeOff } from "lucide-react";

export default function SignatureEditor() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSignature();
  }, []);

  async function fetchSignature() {
    setLoading(true);
    try {
      const res = await fetch("/api/signature");
      if (res.ok) {
        const data = await res.json();
        if (data.signature) {
          setHtml(data.signature);
          if (editorRef.current) {
            editorRef.current.innerHTML = data.signature;
          }
        }
      }
    } catch {}
    setLoading(false);
  }

  async function saveSignature() {
    setSaving(true);
    const currentHtml = editorRef.current?.innerHTML || "";
    try {
      const res = await fetch("/api/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: currentHtml }),
      });
      if (res.ok) {
        setHtml(currentHtml);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  }

  async function clearSignature() {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setHtml("");
    await fetch("/api/signature", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature: "" }),
    });
  }

  // When editor loads, set initial content
  useEffect(() => {
    if (!loading && editorRef.current && html) {
      editorRef.current.innerHTML = html;
    }
  }, [loading, html]);

  return (
    <div className="space-y-6">
      {/* Signature section */}
      <div className="bg-[var(--bg-list)] border-[0.5px] border-[var(--border-subtle)] rounded-[12px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-medium text-[var(--text-primary)]">Email Signature</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Paste your signature from Outlook — formatting, images, and links are preserved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[var(--text-tertiary)] bg-[var(--hover-subtle)] border-[0.5px] border-[var(--border-mid)] rounded-md hover:text-[var(--text-primary)] transition-colors"
            >
              {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
          </div>
        ) : preview ? (
          /* Preview mode — shows rendered signature */
          <div className="border-[0.5px] border-[var(--border-subtle)] rounded-lg p-4 min-h-[120px] bg-white">
            <div dangerouslySetInnerHTML={{ __html: html || "<span style='color:#999'>No signature set</span>" }} />
          </div>
        ) : (
          /* Edit mode — contentEditable rich text */
          <>
            <div className="text-[11px] text-[var(--text-muted)] mb-2 flex items-center gap-3">
              <span>Tip: Copy your signature from Outlook (Cmd+C) and paste here (Cmd+V)</span>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                if (editorRef.current) setHtml(editorRef.current.innerHTML);
              }}
              className="border-[0.5px] border-[var(--border-mid)] rounded-lg p-4 min-h-[150px] max-h-[400px] overflow-y-auto bg-white text-[#1a1a2e] text-[14px] leading-relaxed focus:border-[var(--accent)] focus:outline-none transition-colors"
              style={{ fontFamily: "Aptos, Calibri, Arial, sans-serif" }}
            />
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={saveSignature}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Signature"}
          </button>
          <button
            onClick={clearSignature}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-[var(--accent-tint-soft)] border-[0.5px] border-[var(--accent)]/20 rounded-lg px-4 py-3">
        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
          <strong className="text-[var(--accent)]">Note:</strong> When you Reply or Forward via Microsoft Graph,
          Outlook automatically appends your configured signature from your Outlook settings.
          This saved signature is used by the AI draft system to understand your sign-off style
          and for previewing how your replies will look.
        </p>
      </div>
    </div>
  );
}
