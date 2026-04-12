"use client";

import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f7f9]">
      <div className="bg-white border-[0.5px] border-[#e0e0e8] rounded-[12px] p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-medium text-[#9a2828] mb-2">Access Denied</h1>
        <p className="text-[#5a5a72] text-sm mb-6">This application is restricted to authorized users only.</p>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="px-6 py-2.5 bg-[#eef0f6] text-[#607088] rounded-md border-[0.5px] border-[#cacad8] hover:bg-[#e0e4ec] font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
