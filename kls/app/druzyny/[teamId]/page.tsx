import { notFound } from "next/navigation";
import { LeagueSite } from "@/components/league-site";
import { getLeagueSnapshot } from "@/lib/league-data";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId: value } = await params;
  const teamId = Number(value);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();
  const snapshot = await getLeagueSnapshot();
  if (!snapshot.teams.some((team) => team.id === teamId && team.active)) notFound();
  return <LeagueSite snapshot={snapshot} page="team" teamId={teamId} />;
}
