import { env } from "cloudflare:workers";
import { z } from "zod";

const fields = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200), subject: z.string().trim().min(2).max(160), message: z.string().trim().min(5).max(5000) });
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
function base64(bytes: Uint8Array) { let value = ""; for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(value); }

export async function POST(request: Request) {
  const config = env as unknown as { RESEND_API_KEY?: string; CONTACT_EMAIL?: string; CONTACT_FROM?: string };
  if (!config.RESEND_API_KEY) return Response.json({ error: "Wysyłka wiadomości nie została jeszcze aktywowana przez administratora." }, { status: 503 });
  const form = await request.formData();
  const parsed = fields.safeParse({ name: form.get("name"), email: form.get("email"), subject: form.get("subject"), message: form.get("message") });
  if (!parsed.success) return Response.json({ error: "Sprawdź imię, adres e-mail, temat i treść wiadomości." }, { status: 400 });
  const files = form.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > 5) return Response.json({ error: "Można dodać maksymalnie 5 załączników." }, { status: 400 });
  if (files.some((file) => file.size > 5 * 1024 * 1024 || !allowedTypes.has(file.type))) return Response.json({ error: "Załączniki muszą być plikami JPG, PNG, WebP, PDF lub DOCX do 5 MB." }, { status: 400 });
  if (files.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024) return Response.json({ error: "Łączny rozmiar załączników może wynosić maksymalnie 10 MB." }, { status: 413 });
  const attachments = await Promise.all(files.map(async (file) => ({ filename: file.name, content: base64(new Uint8Array(await file.arrayBuffer())) })));
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({
    from: config.CONTACT_FROM || "KLS <onboarding@resend.dev>", to: [config.CONTACT_EMAIL || "katolickaligasiatkowki@gmail.com"], reply_to: parsed.data.email,
    subject: `[KLS] ${parsed.data.subject}`, text: `Od: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`, attachments,
  }) });
  if (!response.ok) { console.error("Contact e-mail failed", response.status, await response.text()); return Response.json({ error: "Nie udało się wysłać wiadomości. Spróbuj ponownie później." }, { status: 502 }); }
  return Response.json({ ok: true });
}

