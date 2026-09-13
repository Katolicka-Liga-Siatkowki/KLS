import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  displayName: z.string().trim().max(120).default(""),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = adminSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Podaj prawidłowy adres e-mail." }, { status: 400 });
  await getD1().prepare("INSERT INTO admins (email, display_name, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name")
    .bind(parsed.data.email, parsed.data.displayName, new Date().toISOString()).run();
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
  await getD1().prepare("DELETE FROM admins WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
