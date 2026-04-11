"use client";

import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080f0d]">
      <div className="bg-[#111c18] border-[0.5px] border-[#1e3028] rounded-[12px] p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-[10px] bg-[rgba(200,160,64,0.15)] flex items-center justify-center mx-auto mb-5">
          <Mail className="w-6 h-6 text-[#c8a040]" />
        </div>
        <h1 className="text-2xl font-medium text-[#f0ece4] mb-2">
          PHG Inbox Command Center
        </h1>
        <p className="text-[#b0a890] text-sm mb-6 leading-relaxed">
          Sign in with your Microsoft account to access the email triage
          dashboard.
        </p>
        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          className="w-full px-6 py-3 bg-[#c8a040] text-white rounded-md hover:bg-[#a88030] font-medium transition-colors"
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
