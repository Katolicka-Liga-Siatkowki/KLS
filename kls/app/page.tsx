import Link from "next/link";
import { LeagueSite } from "@/components/league-site";
import { getLeagueSnapshot } from "@/lib/league-data";

export const dynamic = "force-dynamic";

async function loadSnapshot() {
  try {
    return await getLeagueSnapshot();
  } catch {
    return null;
  }
}

export default async function Home() {
  const snapshot = await loadSnapshot();
  if (!snapshot) {
    return (
      <main className="service-error">
        <img src="/assets/logo-kls.jpg" alt="Katolicka Liga Siatkówki" />
        <h1>Strona ligi jest chwilowo niedostępna</h1>
        <p>Nie udało się pobrać aktualnych danych. Spróbuj ponownie za kilka minut.</p>
        <Link href="/">Odśwież stronę</Link>
      </main>
    );
  }
  return <LeagueSite snapshot={snapshot} page="start" />;
}
