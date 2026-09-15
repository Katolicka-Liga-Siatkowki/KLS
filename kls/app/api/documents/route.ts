import { getD1 } from "@/lib/league-data";
export async function GET() {
 const result=await getD1().prepare("SELECT id,title,description,filename,mime,size,visible,sort_order,updated_at FROM documents WHERE visible=1 ORDER BY sort_order,title").all();
 return Response.json(result.results,{headers:{"Cache-Control":"no-store"}});
}
