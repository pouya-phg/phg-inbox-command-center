"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white border rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-4">
          {error === "AccessDenied"
            ? "Your account is not authorized to access this application."
            : "An error occurred during sign in. Please try again."}
        </p>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
