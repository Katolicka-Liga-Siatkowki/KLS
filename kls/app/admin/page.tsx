import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminUser } from "@/lib/admin-auth";
import { getLeagueSnapshot, reconcileAdminPlayersWithGoogleSheets } from "@/lib/league-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  try {
    await reconcileAdminPlayersWithGoogleSheets();
  } catch (error) {
    console.error("Google Sheets synchronization unavailable in admin", error);
  }
  const snapshot = await getLeagueSnapshot({ useGoogleSheets: false, includeOfficialMatches: true });
  return <AdminDashboard snapshot={snapshot} user={{ email: user.email, displayName: user.displayName }} signOutPath="/api/admin/logout" />;
}
