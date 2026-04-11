"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080f0d]">
      <div className="bg-[#111c18] border-[0.5px] border-[#1e3028] rounded-[12px] p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-medium text-[#c06858] mb-2">
          Authentication Error
        </h1>
        <p className="text-[#b0a890] text-sm mb-6">
          {error === "AccessDenied"
            ? "Your account is not authorized to access this application."
            : "An error occurred during sign in. Please try again."}
        </p>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-2.5 bg-[#c8a040] text-white rounded-md hover:bg-[#a88030] font-medium transition-colors"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#080f0d] text-[#6e6858]">
          Loading...
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
