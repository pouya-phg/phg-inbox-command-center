"use client";
import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c1014]">
      <div className="bg-[#101418] border-[0.5px] border-[#1c2226] rounded-[10px] p-8 max-w-md w-full text-center">
        <h1 className="text-[14px] font-medium text-[#b06050] mb-2">Access Denied</h1>
        <p className="text-[#8a9098] text-[10px] mb-6">This application is restricted to authorized users only.</p>
        <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} className="px-6 py-2 bg-[rgba(255,255,255,0.04)] text-[rgba(200,204,208,0.45)] text-[10px] rounded-[5px] border-[0.5px] border-[#1c2226] hover:text-[#c8ccd0] font-medium transition-colors">Sign Out</button>
      </div>
    </div>
  );
}
