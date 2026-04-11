"use client";

import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080f0d]">
      <div className="bg-[#111c18] border-[0.5px] border-[#1e3028] rounded-[12px] p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-medium text-[#c06858] mb-2">
          Access Denied
        </h1>
        <p className="text-[#b0a890] text-sm mb-6">
          This application is restricted to authorized users only.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="px-6 py-2.5 bg-[rgba(200,160,64,0.12)] text-[#c8a040] rounded-md border-[0.5px] border-[#264038] hover:bg-[rgba(200,160,64,0.20)] font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
