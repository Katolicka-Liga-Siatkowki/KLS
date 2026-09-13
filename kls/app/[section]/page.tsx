import { notFound } from "next/navigation";
import { LeagueSite } from "@/components/league-site";
import { getLeagueSnapshot } from "@/lib/league-data";

export const dynamic = "force-dynamic";

const standardPages = new Set(["aktualnosci", "tabela", "mecze", "druzyny", "galeria", "zgloszenia", "dokumenty", "kontakt"]);

export default async function LeagueSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const snapshot = await getLeagueSnapshot();
  const customPage = snapshot.sections.some((item) => item.kind === "custom" && item.visible && item.sectionKey === section);
  if (!standardPages.has(section) && !customPage) notFound();
  return <LeagueSite snapshot={snapshot} page={section} />;
}

