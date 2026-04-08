"use client";

import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white border rounded-lg p-8 max-w-md w-full text-center">
        <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          PHG Inbox Command Center
        </h1>
        <p className="text-gray-600 mb-6">
          Sign in with your Microsoft account to access the email triage
          dashboard.
        </p>
        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
