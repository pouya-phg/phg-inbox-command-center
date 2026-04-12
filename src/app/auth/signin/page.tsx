"use client";

import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f7f9]">
      <div className="bg-white border-[0.5px] border-[#e0e0e8] rounded-[12px] p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-[10px] bg-[#eef0f6] flex items-center justify-center mx-auto mb-5">
          <Mail className="w-6 h-6 text-[#8090a8]" />
        </div>
        <h1 className="text-xl font-medium text-[#1a1a2e] mb-2">
          PHG Inbox Command Center
        </h1>
        <p className="text-[#5a5a72] text-sm mb-6 leading-relaxed">
          Sign in with your Microsoft account to access the email triage dashboard.
        </p>
        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          className="w-full px-6 py-3 bg-[#a88830] text-white rounded-md hover:bg-[#886810] font-medium transition-colors"
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
