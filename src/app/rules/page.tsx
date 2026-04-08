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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Triage Rules</h1>
        <a
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </a>
      </div>
      <RuleBuilder />
    </div>
  );
}
