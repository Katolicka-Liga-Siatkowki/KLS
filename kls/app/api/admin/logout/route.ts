import { clearAdminSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  await clearAdminSession();
  return Response.redirect(new URL("/", request.url), 303);
}
