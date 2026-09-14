import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";
import { getSheetLinks, parseSheetLinks, sheetLinksSchema } from "@/lib/sheet-settings";
export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  return Response.json(await getSheetLinks(), {headers:{"Cache-Control":"no-store"}});
}
export async function PUT(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  let links;
  try { links = sheetLinksSchema.parse(await request.json()); parseSheetLinks(links); }
  catch (error) { return Response.json({error: error instanceof Error ? error.message : "Niepoprawne linki."},{status:400}); }
  await ensureSeeded();
  await getD1().prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind("google_sheet_links",JSON.stringify(links)).run();
  return Response.json({ok:true});
}
