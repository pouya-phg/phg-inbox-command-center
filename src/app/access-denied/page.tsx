"use client";
import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)]">
      <div className="bg-[var(--bg-list)] border-[0.5px] border-[var(--border-subtle)] rounded-[10px] p-8 max-w-md w-full text-center">
        <h1 className="text-[14px] font-medium text-[var(--danger)] mb-2">Access Denied</h1>
        <p className="text-[var(--text-tertiary)] text-[10px] mb-6">This application is restricted to authorized users only.</p>
        <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} className="px-6 py-2 bg-[var(--hover-subtle)] text-[var(--text-tertiary)] text-[10px] rounded-[5px] border-[0.5px] border-[var(--border-subtle)] hover:text-[var(--text-primary)] font-medium transition-colors">Sign Out</button>
      </div>
    </div>
  );
}
