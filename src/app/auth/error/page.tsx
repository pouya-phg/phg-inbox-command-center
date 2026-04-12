"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f7f9]">
      <div className="bg-white border-[0.5px] border-[#e0e0e8] rounded-[12px] p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-medium text-[#9a2828] mb-2">Authentication Error</h1>
        <p className="text-[#5a5a72] text-sm mb-6">
          {error === "AccessDenied"
            ? "Your account is not authorized to access this application."
            : "An error occurred during sign in. Please try again."}
        </p>
        <a href="/auth/signin" className="inline-block px-6 py-2.5 bg-[#a88830] text-white rounded-md hover:bg-[#886810] font-medium transition-colors">
          Try Again
        </a>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#f7f7f9] text-[#9898b0]">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
