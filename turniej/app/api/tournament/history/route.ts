import {env} from 'cloudflare:workers';
import {getTournamentUser} from '@/lib/auth';
export async function GET(request:Request){
 const headers={'Cache-Control':'no-store'};const user=await getTournamentUser();
 if(!user)return Response.json({error:'Zaloguj się jako organizator.'},{status:401,headers});
 const current=await env.DB.prepare('SELECT owner FROM tournament WHERE id=1').first<{owner:string}>();
 if(!current||current.owner!==user.email.toLowerCase())return Response.json({error:'Historia jest dostępna tylko organizatorowi.'},{status:403,headers});
 const id=new URL(request.url).searchParams.get('id');
 if(id){const row=await env.DB.prepare('SELECT id,created_at,state FROM tournament_history WHERE id=? AND owner=?').bind(id,current.owner).first<{id:string,created_at:string,state:string}>();if(!row)return Response.json({error:'Nie znaleziono turnieju.'},{status:404,headers});return Response.json({...row,state:JSON.parse(row.state)},{headers})}
 const rows=await env.DB.prepare("SELECT id,created_at,json_extract(state,'$.title') AS title,json_array_length(state,'$.matches') AS matches FROM tournament_history WHERE owner=? ORDER BY created_at DESC,id DESC").bind(current.owner).all();
 return Response.json({history:rows.results},{headers});
}
