import { redirect } from "next/navigation";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import RuleBuilder from "@/components/RuleBuilder";

export default async function RulesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/auth/signin");
  if (!isAuthorized(session.user?.email)) redirect("/access-denied");

  return (
    <div className="min-h-screen bg-[#f7f7f9]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-[#1a1a2e]">Triage Rules</h1>
            <p className="text-[13px] text-[#9898b0] mt-0.5">Auto-classify emails by sender, subject, or content</p>
          </div>
          <a href="/" className="text-[13px] text-[#8090a8] hover:text-[#607088] font-medium transition-colors">
            ← Back
          </a>
        </div>
        <RuleBuilder />
      </div>
    </div>
  );
}
