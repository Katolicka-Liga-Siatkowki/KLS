import { setAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !(await verifyAdminCredentials(email, password))) {
    return Response.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  await setAdminSession(email);
  return Response.redirect(new URL("/admin", request.url), 303);
}
