import { redirect } from "next/navigation";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/auth/signin");
  }

  if (!isAuthorized(session.user?.email)) {
    redirect("/access-denied");
  }

  return <Dashboard />;
}
