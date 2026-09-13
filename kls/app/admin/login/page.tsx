import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminUser()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="admin-access">
      <form className="admin-access-card" method="post" action="/api/admin/login">
        <img src="/assets/logo-kls.jpg" alt="Logo ligi" />
        <p className="eyebrow">Panel administracyjny</p>
        <h1>Logowanie do obsługi ligi</h1>
        <p>Dostęp mają wyłącznie osoby dodane przez administratora.</p>
        {error ? <p role="alert"><strong>Nieprawidłowy adres e-mail lub hasło.</strong></p> : null}
        <label>
          Adres e-mail
          <input name="email" type="email" autoComplete="username" required maxLength={200} />
        </label>
        <label>
          Hasło
          <input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={200} />
        </label>
        <div className="admin-actions">
          <button className="btn primary" type="submit">Zaloguj się</button>
          <a className="btn dark" href="/">Wróć na stronę</a>
        </div>
      </form>
    </main>
  );
}

