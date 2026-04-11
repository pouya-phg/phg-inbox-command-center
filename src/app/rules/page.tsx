import { redirect } from "next/navigation";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import RuleBuilder from "@/components/RuleBuilder";

export default async function RulesPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/auth/signin");
  }

  if (!isAuthorized(session.user?.email)) {
    redirect("/access-denied");
  }

  return (
    <div className="min-h-screen bg-[#080f0d]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-medium text-[#f0ece4] tracking-[-0.01em]">
              Triage Rules
            </h1>
            <p className="text-sm text-[#6e6858] mt-1">
              Auto-classify emails by sender, subject, or content
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-[#c8a040] hover:text-[#a88030] font-medium transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
        <RuleBuilder />
      </div>
    </div>
  );
}
