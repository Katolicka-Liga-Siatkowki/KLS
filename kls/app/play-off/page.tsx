import {notFound} from "next/navigation";
import {getLeagueSnapshot} from "@/lib/league-data";
import {getPlayoffSettings,loadPlayoff} from "@/lib/playoff-data";
import {LeagueSite} from "@/components/league-site";
export const dynamic="force-dynamic";
export default async function PlayoffPage(){const settings=await getPlayoffSettings();if(!settings.visible)notFound();const snapshot=await getLeagueSnapshot();const data=await loadPlayoff(settings,snapshot.season);return <LeagueSite snapshot={snapshot} page="play-off" playoff={data}/>;}
