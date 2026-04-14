"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)]">
      <div className="bg-[var(--bg-list)] border-[0.5px] border-[var(--border-subtle)] rounded-[10px] p-8 max-w-md w-full text-center">
        <h1 className="text-[14px] font-medium text-[var(--danger)] mb-2">Authentication Error</h1>
        <p className="text-[var(--text-tertiary)] text-[10px] mb-6">{error === "AccessDenied" ? "Your account is not authorized." : "An error occurred. Please try again."}</p>
        <a href="/auth/signin" className="inline-block px-6 py-2 bg-[var(--accent)] text-white text-[10px] rounded-[5px] hover:bg-[var(--accent-hover)] font-medium transition-colors">Try Again</a>
      </div>
    </div>
  );
}
export default function AuthError() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--bg-app)] text-[var(--text-muted)]">Loading...</div>}><ErrorContent /></Suspense>;
}
