"use client";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c1014]">
      <div className="bg-[#101418] border-[0.5px] border-[#1c2226] rounded-[10px] p-8 max-w-md w-full text-center">
        <div className="w-11 h-11 rounded-lg bg-[rgba(180,138,70,0.16)] flex items-center justify-center mx-auto mb-5">
          <Mail className="w-5 h-5 text-[#b48a46]" />
        </div>
        <h1 className="text-[16px] font-medium text-[#c8ccd0] mb-2">PHG Inbox Command Center</h1>
        <p className="text-[#8a9098] text-[11px] mb-6 leading-relaxed">Sign in with your Microsoft account to access the email triage dashboard.</p>
        <button onClick={() => signIn("azure-ad", { callbackUrl: "/" })} className="w-full px-6 py-2.5 bg-[#b48a46] text-white text-[11px] rounded-[5px] hover:bg-[#906830] font-medium transition-colors">
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
