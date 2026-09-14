import { env } from "cloudflare:workers";
import { z } from "zod";
export const sheetKeys = ["table", "matches", "teams", "players"] as const;
export const sheetLinksSchema = z.object({
  table: z.string().max(1000), matches: z.string().max(1000), teams: z.string().max(1000), players: z.string().max(1000),
});
export type SheetLinks = z.infer<typeof sheetLinksSchema>;
export const emptySheetLinks: SheetLinks = { table: "", matches: "", teams: "", players: "" };
export function parseSheetLinks(links: SheetLinks) {
  const parsed = sheetKeys.map(key => {
    const url = new URL(links[key]);
    const id = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1];
    const gid = url.searchParams.get("gid") ?? new URLSearchParams(url.hash.slice(1)).get("gid");
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || !id || !gid || !/^\d+$/.test(gid)) throw new Error("Wklej link do każdej zakładki Arkusza Google, zawierający gid (np. #gid=0).");
    return {key, id, gid};
  });
  if (parsed.some(item => item.id !== parsed[0].id)) throw new Error("Wszystkie zakładki muszą pochodzić z tego samego arkusza.");
  return { id: parsed[0].id, gids: Object.fromEntries(parsed.map(item => [item.key,item.gid])) as Record<typeof sheetKeys[number],string> };
}
export async function getSheetLinks(): Promise<SheetLinks> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("google_sheet_links").first<{value:string}>();
  return row ? sheetLinksSchema.parse(JSON.parse(row.value)) : emptySheetLinks;
}
