"use client";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)]">
      <div className="bg-[var(--bg-list)] border-[0.5px] border-[var(--border-subtle)] rounded-[10px] p-8 max-w-md w-full text-center">
        <div className="w-11 h-11 rounded-lg bg-[var(--accent-tint-strong)] flex items-center justify-center mx-auto mb-5">
          <Mail className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <h1 className="text-[16px] font-medium text-[var(--text-primary)] mb-2">PHG Inbox Command Center</h1>
        <p className="text-[var(--text-tertiary)] text-[11px] mb-6 leading-relaxed">Sign in with your Microsoft account to access the email triage dashboard.</p>
        <button onClick={() => signIn("azure-ad", { callbackUrl: "/" })} className="w-full px-6 py-2.5 bg-[var(--accent)] text-white text-[11px] rounded-[5px] hover:bg-[var(--accent-hover)] font-medium transition-colors">
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
