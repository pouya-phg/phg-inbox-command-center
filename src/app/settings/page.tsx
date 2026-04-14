import { redirect } from "next/navigation";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import SignatureEditor from "@/components/SignatureEditor";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/auth/signin");
  if (!isAuthorized(session.user?.email)) redirect("/access-denied");

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-[var(--text-primary)]">Settings</h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Configure your email preferences</p>
          </div>
          <a href="/" className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">
            ← Back
          </a>
        </div>
        <SignatureEditor />
      </div>
    </div>
  );
}
