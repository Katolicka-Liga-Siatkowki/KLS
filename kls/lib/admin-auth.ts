import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { ensureSeeded, getD1 } from "./league-data";

export type AdminUser = {
  email: string;
  displayName: string;
};

const SESSION_COOKIE = "kls_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function runtimeEnv() {
  return env as unknown as {
    INITIAL_ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    SESSION_SECRET?: string;
  };
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function initialAdminEmail() {
  return normalize(runtimeEnv().INITIAL_ADMIN_EMAIL ?? "");
}

export async function isAdminEmail(email: string) {
  const normalized = normalize(email);
  if (!normalized) return false;
  if (normalized === initialAdminEmail()) return true;
  await ensureSeeded();
  const row = await getD1().prepare("SELECT id FROM admins WHERE lower(email) = ? LIMIT 1").bind(normalized).first();
  return Boolean(row);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(a: string, b: string) {
  const max = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < max; i += 1) result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return result === 0;
}

async function tokenHash(token: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

export async function verifyAdminCredentials(email: string, password: string) {
  const configuredPassword = runtimeEnv().ADMIN_PASSWORD ?? "";
  if (configuredPassword.length < 12 || !constantTimeEqual(password, configuredPassword)) return false;
  return isAdminEmail(email);
}

export async function setAdminSession(email: string) {
  await ensureSeeded();
  const random = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64Url(random);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const db = getD1();
  await db.prepare("DELETE FROM admin_sessions WHERE expires_at < ?").bind(Math.floor(Date.now() / 1000)).run();
  await db.prepare("INSERT INTO admin_sessions (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await tokenHash(token), normalize(email), expiresAt, new Date().toISOString()).run();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await getD1().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
    } catch {
      // Cookie is still cleared even if the session row is already unavailable.
    }
  }
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    await ensureSeeded();
    const row = await getD1().prepare("SELECT email, expires_at FROM admin_sessions WHERE token_hash = ? LIMIT 1")
      .bind(await tokenHash(token)).first<{ email: string; expires_at: number }>();
    const email = normalize(row?.email ?? "");
    if (!email || !row?.expires_at || row.expires_at < Math.floor(Date.now() / 1000) || !(await isAdminEmail(email))) return null;
    return { email, displayName: email };
  } catch {
    return null;
  }
}

export async function requireAdminApi() {
  const user = await getAdminUser();
  if (!user) return { user: null, response: Response.json({ error: "Brak uprawnień administratora." }, { status: 403 }) };
  return { user, response: null };
}
