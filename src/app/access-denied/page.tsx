"use client";

import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white border rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          This application is restricted to authorized users only.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
