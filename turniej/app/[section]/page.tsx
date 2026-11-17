import {notFound} from 'next/navigation';
import TournamentApp from '../tournament-app';
const sections=['centrum','terminarz','tabela','ranking-mvp','faza-pucharowa','druzyny','panel-sedziego','panel-zawodow'];
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!sections.includes(section))notFound();return <TournamentApp/>}
