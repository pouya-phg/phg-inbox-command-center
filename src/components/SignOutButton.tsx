"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] rounded-md transition-colors w-full"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}
