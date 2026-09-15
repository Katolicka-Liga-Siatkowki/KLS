"use client";

import { Documents } from "./documents";
import { type FormEvent, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Download, Images, Mail, MapPin, Menu, Newspaper, Paperclip, Send, ShieldCheck, Trophy, Users, X } from "lucide-react";
import type { LeagueMatch, LeagueSnapshot, Team } from "@/lib/league-types";

const polishDate = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function TeamMark({ team, className }: { team: Pick<Team, "name" | "logoUrl">; className: string }) {
  return <span className={className}>{team.logoUrl ? <img src={team.logoUrl} alt={`Logo ${team.name}`} /> : initials(team.name)}</span>;
}

function FormDots({ form }: { form: ("W" | "P")[] }) {
  if (!form.length) return <span className="form-empty">brak meczów</span>;
  return (
    <span className="form-dots">
      {form.map((result, index) => {
        const label = result === "W" ? "Wygrana" : "Porażka";
        return <i key={index} className={result === "W" ? "win" : "loss"} aria-label={label} title={label} />;
      })}
    </span>
  );
}

function visibleLinkLabel(link: LeagueSnapshot["links"][number]) {
  return link.url.toLocaleLowerCase("pl").startsWith("mailto:") ? link.url.slice(7) : link.label;
}

function MatchCard({ match }: { match: LeagueMatch }) {
  const finished = match.status === "finished";
  const dateLabel = match.displayDate || (match.matchDate.startsWith("9999-") ? "Termin do ustalenia" : polishDate.format(new Date(match.matchDate)));
  return (
    <article className="match-card">
      {(match.photos?.length || match.imageUrl) && <div className="match-album">
        {match.imageUrl && <img src={match.imageUrl} alt={`Zdjęcie z meczu ${match.homeTeam} — ${match.awayTeam}`} />}
        {match.photos?.map((photo) => <a href={photo.url} target="_blank" rel="noopener" key={photo.id}><img src={photo.url} alt={photo.caption || `Zdjęcie z meczu ${match.homeTeam} — ${match.awayTeam}`} /></a>)}
      </div>}
      <div className="match-meta"><CalendarDays size={16} />{dateLabel}</div>
      <div className="match-line">
        <strong>{match.homeTeam}</strong>
        <div className={finished ? "score finished" : "score"}>
          {finished ? `${match.homeSets} : ${match.awaySets}` : "–"}
          <small>{finished ? (match.setScores.length ? match.setScores.join(" · ") : match.smallPoints ? `małe punkty ${match.smallPoints}` : "WYNIK KOŃCOWY") : "NADCHODZĄCY"}</small>
        </div>
        <strong>{match.awayTeam}</strong>
      </div>
      {match.venue && <div className="match-venue"><MapPin size={15} />{match.venue}</div>}
    </article>
  );
}

function ContactForm({ subject = "Kontakt ze strony KLS", attachments = false }: { subject?: string; attachments?: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("sending"); setMessage("");
    const form = event.currentTarget;
    try {
    const response = await fetch("/api/contact", { method: "POST", body: new FormData(form) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (response.ok) { form.reset(); setStatus("sent"); setMessage("Wiadomość została wysłana do Zarządu KLS."); }
    else { setStatus("error"); setMessage(result.error || "Nie udało się wysłać wiadomości."); }
    } catch { setStatus("error"); setMessage("Błąd połączenia. Sprawdź połączenie z internetem i spróbuj ponownie."); }
  }
  return <form className="contact-form" onSubmit={submit}>
    <input type="hidden" name="kind" value={attachments ? "registration" : "contact"} />
    <label style={{display:"none"}} aria-hidden="true">Zostaw puste<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <div className="form-pair"><label>Imię i nazwisko<input name="name" required /></label><label>Twój adres e-mail<input name="email" type="email" required /></label></div>
    <label>Temat<input name="subject" defaultValue={subject} required /></label>
    <label>Wiadomość<textarea name="message" rows={6} required /></label>
    {attachments && <label className="attachment-field"><Paperclip size={18} /> Załączniki (maks. 5 plików)<input name="attachments" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx" /></label>}
    <button className="btn dark" type="submit" disabled={status === "sending"}><Send size={17} />{status === "sending" ? "Wysyłanie…" : "Wyślij wiadomość"}</button>
    {message && <p className={`form-message ${status}`}>{message}</p>}
  </form>;
}

function SectionImage({ src, title }: { src?: string; title: string }) {
  return src ? <img className="section-cover-image" src={src} alt={`Zdjęcie sekcji ${title}`} /> : null;
}

const standardRoutes: Record<string, string> = {
  start: "/",
  aktualnosci: "/aktualnosci",
  tabela: "/tabela",
  mecze: "/mecze",
  druzyny: "/druzyny",
  zgloszenia: "/zgloszenia",
  dokumenty: "/dokumenty",
  galeria: "/galeria",
  kontakt: "/kontakt",
};

function sectionRoute(key: string) {
  return standardRoutes[key] ?? `/${key}`;
}

export function LeagueSite({ snapshot, page = "start", teamId, galleryAlbumId }: { snapshot: LeagueSnapshot; page?: string; teamId?: number; galleryAlbumId?: number }) {
  const league = 1;
  const [menuOpen, setMenuOpen] = useState(false);
  const standings = snapshot.standings[String(league)] ?? [];
  const teams = snapshot.teams.filter((team) => team.league === league && team.active);
  const matches = snapshot.matches.filter((match) => match.league === league && match.published);
  const upcoming = useMemo(() => matches.filter((match) => match.status === "scheduled").sort((a, b) => a.matchDate.localeCompare(b.matchDate)), [matches]);
  const finished = useMemo(() => matches.filter((match) => match.status === "finished").sort((a, b) => b.matchDate.localeCompare(a.matchDate)), [matches]);
  const sectionMap = new Map(snapshot.sections.map((section) => [section.sectionKey, section]));
  const section = (key: string) => sectionMap.get(key);
  const sectionProps = (key: string) => {
    const item = section(key);
    return { hidden: item ? !item.visible : false };
  };
  const navSections = snapshot.sections.filter((item) => item.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  const navItems = navSections;
  const footerLinks = snapshot.links.filter((link) => link.visible && link.location === "footer");
  const socialLinks = snapshot.links.filter((link) => link.visible && link.location === "social");
  const contactEmail = footerLinks.find((link) => link.url.toLocaleLowerCase("pl").startsWith("mailto:"));
  const nonEmailFooterLinks = footerLinks.filter((link) => !link.url.toLocaleLowerCase("pl").startsWith("mailto:"));
  const teamPage = teamId ? snapshot.teams.find((team) => team.id === teamId && team.active) : undefined;
  const teamStanding = teamPage ? (snapshot.standings[String(teamPage.league)] ?? []).find((row) => row.teamId === teamPage.id || row.name === teamPage.name) : undefined;
  const teamPlace = teamPage ? (snapshot.standings[String(teamPage.league)] ?? []).findIndex((row) => row.teamId === teamPage.id || row.name === teamPage.name) + 1 : 0;
  const galleryAlbum = galleryAlbumId ? snapshot.galleryAlbums.find((album) => album.id === galleryAlbumId && album.visible) : undefined;
  const visibleNews = snapshot.newsPosts.filter((post) => post.visible);

  return (
    <>
      <header className="site-header">
        <div className="header-brand-row">
          <a className="brand" href="/" aria-label="Strona główna KLS">
            <img src="/assets/logo-kls.jpg" alt="" />
            <span><b>Katolicka</b><small>Liga Siatkówki</small></span>
          </a>
          <div className="header-actions">
            <button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Otwórz menu">{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        <nav className={menuOpen ? "open" : ""} aria-label="Nawigacja główna">
          {navItems.map((item) => <a className={page === item.sectionKey || (page === "team" && item.sectionKey === "druzyny") ? "active" : ""} href={sectionRoute(item.sectionKey)} key={item.id} onClick={() => setMenuOpen(false)}>{item.navLabel}</a>)}
        </nav>
      </header>

      <main className={`site-sections league-theme-${teamPage?.league ?? league}`}>
        {page === "start" && <section className="hero" id="start" data-section-key="start" {...sectionProps("start")}>
          {section("start")?.imageUrl && <img className="hero-custom-image" src={section("start")?.imageUrl} alt="Katolicka Liga Siatkówki" />}
          <div className="hero-copy">
            <span className="eyebrow">CZYM JEST KLS · SEZON {snapshot.season}</span>
            <h1>{section("start")?.title ?? "Katolicka Liga Siatkówki"}</h1>
            <p>{section("start")?.body}</p>
            <div className="hero-actions">
              <a className="btn primary" href="/mecze">Zobacz mecze <ChevronRight size={18} /></a>
              <a className="btn secondary" href="/tabela">Tabela ligowa</a>
            </div>
          </div>
          <div className="hero-panel">
            <div><Trophy /><span>Aktualna liga</span><strong>KLS</strong></div>
            <div><Users /><span>Drużyny</span><strong>{teams.length}</strong></div>
            <div><CalendarDays /><span>Mecze w bazie</span><strong>{matches.length}</strong></div>
          </div>
        </section>}

        {["start", "tabela", "mecze", "druzyny"].includes(page) && <section className="league-bar" aria-label="Rozgrywki KLS">
          <span>ROZGRYWKI</span>
          <div><strong>KLS</strong></div>
          <small className={snapshot.dataSource.mode === "google-sheets" ? "source-live" : "source-backup"}>{snapshot.dataSource.mode === "google-sheets" ? "Dane z Arkuszy Google" : snapshot.dataSource.mode === "mixed" ? "Część danych z kopii zapasowej" : "Dane rozgrywek zostaną wkrótce opublikowane"}</small>
        </section>}

        {(page === "start" || page === "aktualnosci") && <section className="content-section news-section" id="aktualnosci">
          <div className="section-title"><div><span className="eyebrow">{section("aktualnosci")?.eyebrow ?? "NA BIEŻĄCO"}</span><h2>{section("aktualnosci")?.title ?? "Aktualności ligi"}</h2></div><p>{section("aktualnosci")?.body ?? "Najważniejsze informacje organizacyjne i sportowe Katolickiej Ligi Siatkówki."}</p></div>
          <SectionImage src={section("aktualnosci")?.imageUrl} title={section("aktualnosci")?.title ?? "Aktualności"} />
          <div className="news-grid">
            {(visibleNews.length ? visibleNews.slice(0, page === "start" ? 3 : undefined) : [{ id: -1, title: "Rozgrywki KLS", body: "Aktualne tabele, terminarz i wyniki ligi są publikowane na bieżąco na stronie.", publishedAt: "2026-09-01", linkLabel: "", linkUrl: "", visible: true }]).map((post) => <article key={post.id}><Newspaper /><span>{new Date(post.publishedAt).toLocaleDateString("pl-PL")}</span><h3>{post.title}</h3><p>{post.body}</p>{post.linkUrl && <a href={post.linkUrl} target="_blank" rel="noopener">{post.linkLabel || "Więcej informacji"} <ChevronRight size={16} /></a>}</article>)}
          </div>
          {page === "start" && <a className="section-more" href="/aktualnosci">Wszystkie aktualności <ChevronRight size={17} /></a>}
        </section>}

        {(page === "start" || page === "tabela") && <section className="content-section" id="tabela" data-section-key="tabela" {...sectionProps("tabela")}>
          <div className="section-title"><div><span className="eyebrow">{section("tabela")?.eyebrow}</span><h2>{section("tabela")?.title}</h2></div><p>{section("tabela")?.body}</p></div>
          <SectionImage src={section("tabela")?.imageUrl} title={section("tabela")?.title ?? "Tabela"} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Drużyna</th><th>M</th><th>W</th><th>P</th><th>Sety</th><th>Pkt</th><th>Forma</th></tr></thead>
              <tbody>{(page === "start" ? standings.slice(0, 5) : standings).map((row, index) => (
                <tr key={row.teamId}><td className="position">{index + 1}</td><td><span className="team-name"><TeamMark team={teams.find((team) => team.id === row.teamId) ?? { name: row.name }} className="team-table-mark" />{row.name}</span></td><td>{row.played}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.setsWon}:{row.setsLost}</td><td className="points">{row.points}</td><td><FormDots form={row.form} /></td></tr>
              ))}</tbody>
            </table>
          </div>
          {page === "start" && <a className="section-more" href="/tabela">Zobacz pełną tabelę <ChevronRight size={17} /></a>}
        </section>}

        {(page === "start" || page === "mecze") && <section className="content-section alternate" id="mecze" data-section-key="mecze" {...sectionProps("mecze")}>
          <div className="section-title"><div><span className="eyebrow">{section("mecze")?.eyebrow}</span><h2>{section("mecze")?.title}</h2></div><p>{section("mecze")?.body}</p></div>
          <SectionImage src={section("mecze")?.imageUrl} title={section("mecze")?.title ?? "Mecze"} />
          <div className={`matches-layout ${page === "start" ? "single" : ""}`}>
            <div><h3>Najbliższe mecze</h3>{upcoming.length ? upcoming.slice(0, page === "start" ? 4 : undefined).map((match) => <MatchCard key={match.id} match={match} />) : <p className="empty-state">Brak zaplanowanych spotkań.</p>}</div>
            {page === "mecze" && <div><h3>Ostatnie wyniki</h3>{finished.length ? finished.slice(0, 12).map((match) => <MatchCard key={match.id} match={match} />) : <p className="empty-state">Nie wpisano jeszcze wyników.</p>}</div>}
          </div>
          {page === "start" && <a className="section-more" href="/mecze">Pełny terminarz i wyniki <ChevronRight size={17} /></a>}
        </section>}

        {page === "druzyny" && <section className="content-section" id="druzyny" data-section-key="druzyny" {...sectionProps("druzyny")}>
          <div className="section-title"><div><span className="eyebrow">{section("druzyny")?.eyebrow}</span><h2>{section("druzyny")?.title}</h2></div><p>{section("druzyny")?.body}</p></div>
          <SectionImage src={section("druzyny")?.imageUrl} title={section("druzyny")?.title ?? "Drużyny"} />
          <div className="teams-grid">{teams.map((team) => {
            const standing = standings.find((row) => row.teamId === team.id);
            const place = standings.findIndex((row) => row.teamId === team.id) + 1;
            return <a className="team-card" key={team.id} href={`/druzyny/${team.id}`}>
              <div className="team-card-top"><TeamMark team={team} className="team-badge" /><span className="team-place"><b>{place || "–"}.</b> miejsce</span></div>
              <h3>{team.name}</h3><p>{team.location || "Katolicka Liga Siatkówki"}</p>
              <div className="team-stats"><span>Mecze<b>{standing?.played ?? 0}</b></span><span>Punkty<b>{standing?.points ?? 0}</b></span><span>Forma<FormDots form={standing?.form ?? []} /></span></div>
            </a>;
          })}</div>
        </section>}

        {page === "team" && teamPage && <section className="team-profile-page">
          <div className={`team-profile-hero ${teamPage.coverUrl ? "has-cover" : ""}`}>
            {teamPage.coverUrl && <img className="team-cover-image" style={{ objectPosition: `${teamPage.coverPositionX ?? 50}% ${teamPage.coverPositionY ?? 50}%` }} src={teamPage.coverUrl} alt={`Pełny skład drużyny ${teamPage.name}`} />}
            <div className="team-profile-identity">
              <TeamMark team={teamPage} className="team-profile-logo" />
              <div><span className="eyebrow">KLS · {snapshot.season}</span><h1>{teamPage.name}</h1><p>{teamPage.location || "Katolicka Liga Siatkówki"}</p></div>
            </div>
          </div>
          <div className="team-profile-stats">
            <article><span>Miejsce w lidze</span><strong>{teamPlace || "–"}</strong></article>
            <article><span>Rozegrane mecze</span><strong>{teamStanding?.played ?? 0}</strong></article>
            <article><span>Punkty</span><strong>{teamStanding?.points ?? 0}</strong></article>
            <article><span>Forma</span><FormDots form={teamStanding?.form ?? []} /></article>
          </div>
          <div className="content-section team-roster-section">
            <div className="section-title"><div><span className="eyebrow">KADRA DRUŻYNY</span><h2>Zawodnicy</h2></div><p>Aktualny skład zgłoszony do rozgrywek Katolickiej Ligi Siatkówki.</p></div>
            <div className="player-grid">{teamPage.players.filter((player) => player.active).map((player, index) => <article key={player.id}>
              <div><span>{player.number ?? index + 1}</span><h3>{player.name}</h3><p>{player.role}</p></div>
            </article>)}</div>
            {!teamPage.players.some((player) => player.active) && <p className="empty-state">Skład drużyny nie został jeszcze opublikowany.</p>}
          </div>
        </section>}

        {page === "galeria" && <section className="content-section gallery-page" id="galeria">
          <div className="section-title"><div><span className="eyebrow">{section("galeria")?.eyebrow}</span><h2>{section("galeria")?.title ?? "Galeria"}</h2></div><p>{section("galeria")?.body}</p></div>
          <div className="album-grid">{snapshot.galleryAlbums.filter((album) => album.visible).map((album) => <a href={`/galeria/${album.id}`} key={album.id}>
            <div>{album.photos[0] ? <img src={album.photos[0].url} alt="" /> : <Images size={52} />}</div><span>{album.photos.length} zdjęć</span><h3>{album.name}</h3><p>{album.description}</p>
          </a>)}</div>
          {!snapshot.galleryAlbums.some((album) => album.visible) && <p className="empty-state">Galeria nie zawiera jeszcze albumów.</p>}
        </section>}

        {page === "gallery-album" && galleryAlbum && <section className="content-section gallery-page">
          <a className="back-link" href="/galeria">← Wróć do galerii</a>
          <div className="section-title"><div><span className="eyebrow">GALERIA KLS</span><h2>{galleryAlbum.name}</h2></div><p>{galleryAlbum.description}</p></div>
          <div className="photo-grid">{galleryAlbum.photos.map((photo) => <figure key={photo.id}><a href={photo.url} target="_blank" rel="noopener"><img src={photo.url} alt={photo.caption || galleryAlbum.name} /></a>{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div>
          {!galleryAlbum.photos.length && <p className="empty-state">Ten album nie zawiera jeszcze zdjęć.</p>}
        </section>}

        {page === "zgloszenia" && <section className="content-section gold-section" id="zgloszenia" data-section-key="zgloszenia" {...sectionProps("zgloszenia")}>
          <div className="section-title"><div><span className="eyebrow">{section("zgloszenia")?.eyebrow} {snapshot.season}</span><h2>{section("zgloszenia")?.title}</h2></div><p>{section("zgloszenia")?.body}</p></div>
          <SectionImage src={section("zgloszenia")?.imageUrl} title={section("zgloszenia")?.title ?? "Zgłoszenia"} />
          <div className="deadline"><div><span>TERMIN ZGŁOSZEŃ</span><strong>10 września 2026</strong></div><Mail size={34} /></div>
          <div className="steps">
            <article><b>01</b><h3>Pobierz formularz</h3><p>Wpisz nazwę wspólnoty lub parafii, dane kapitana i pełny skład drużyny.</p></article>
            <article><b>02</b><h3>Przygotuj załączniki</h3><p>Dołącz wymagane zgody dla zawodników niepełnoletnich.</p></article>
            <article><b>03</b><h3>Wyślij zgłoszenie</h3><p>Prześlij dokumenty na adres katolickaligasiatkowki@gmail.com.</p></article>
          </div>
          <div className="downloads"><p>Aktualne formularze KLS będą dostępne tutaj po ich przekazaniu przez zarząd. Dokumenty możesz uzyskać pod adresem <a href="mailto:katolickaligasiatkowki@gmail.com">katolickaligasiatkowki@gmail.com</a>.</p></div>
          <div className="submission-mail"><div><span className="eyebrow">WYŚLIJ ZGŁOSZENIE</span><h3>Napisz do Zarządu KLS</h3><p>W formularzu możesz dołączyć przygotowane dokumenty.</p></div><ContactForm subject="Zgłoszenie drużyny KLS" attachments /></div>
        </section>}

        {page === "kontakt" && <section className="content-section contact-page" id="kontakt">
          <div className="section-title"><div><span className="eyebrow">{section("kontakt")?.eyebrow}</span><h2>{section("kontakt")?.title ?? "Kontakt"}</h2></div><p>{section("kontakt")?.body}</p></div>
          <div className="contact-layout"><div><a href="mailto:katolickaligasiatkowki@gmail.com"><Mail /></a><h3>E-mail Zarządu KLS</h3><p><a href="mailto:katolickaligasiatkowki@gmail.com">katolickaligasiatkowki@gmail.com</a></p></div><ContactForm /></div>
        </section>}

        {page === "dokumenty" && <section className="content-section" id="dokumenty" data-section-key="dokumenty" {...sectionProps("dokumenty")}>
          <div className="section-title"><div><span className="eyebrow">{section("dokumenty")?.eyebrow}</span><h2>{section("dokumenty")?.title}</h2></div><p>{section("dokumenty")?.body}</p></div>
          <SectionImage src={section("dokumenty")?.imageUrl} title={section("dokumenty")?.title ?? "Dokumenty"} />
          <Documents />
        </section>}
        {snapshot.sections.filter((item) => item.kind === "custom" && item.visible && item.sectionKey === page).map((item) => (
          <section className={`content-section custom-section custom-${item.layout}`} id={item.sectionKey} data-section-key={item.sectionKey} style={{ order: item.sortOrder * 2 }} key={item.id}>
            <div className="section-title"><div><span className="eyebrow">{item.eyebrow}</span><h2>{item.title}</h2></div><p>{item.body}</p></div>
            <SectionImage src={item.imageUrl} title={item.title} />
          </section>
        ))}
      </main>

      <footer>
        <div className="footer-grid">
          <div className="footer-brand"><img src="/assets/logo-kls.jpg" alt="" /><b>Katolicka<br />Liga Siatkówki</b></div>
          {nonEmailFooterLinks.length > 0 && <div><span>LINKI</span>{nonEmailFooterLinks.map((link) => <a href={link.url} key={link.id} target={link.url.startsWith("http") ? "_blank" : undefined} rel="noopener">{visibleLinkLabel(link)}</a>)}</div>}
          <div><span>OBSERWUJ LIGĘ</span>{socialLinks.map((link) => <a href={link.url} key={link.id} target="_blank" rel="noopener">{link.label === "Facebook" && <img src="/assets/facebook.svg" alt="" />}{link.label === "Instagram" && <img src="/assets/instagram.svg" alt="" />}{link.label}</a>)}</div>
        </div>
        <div className="footer-bottom"><span>Katolicka Liga Siatkówki</span><span className="footer-bottom-email">E-mail: {contactEmail ? visibleLinkLabel(contactEmail) : "katolickaligasiatkowki@gmail.com"}</span><a href="/admin"><ShieldCheck size={15} />Panel administratora</a></div>
      </footer>

    </>
  );
}
