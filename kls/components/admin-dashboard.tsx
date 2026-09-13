"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarDays, FileSpreadsheet, ImagePlus, Images, LayoutDashboard, Link2, LogOut, Newspaper, PanelsTopLeft, ShieldCheck, Swords, Trash2, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { GalleryAlbum, LeagueMatch, LeagueSnapshot, NewsPost, Player, SiteLink, SiteSection, Team } from "@/lib/league-types";
import { matchMediaKey, sectionMediaKey, teamCoverMediaKey } from "@/lib/team-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  snapshot: LeagueSnapshot;
  user: { email: string; displayName: string };
  signOutPath: string;
};

async function api(path: string, method: string, body: unknown) {
  const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Nie udało się zapisać zmian.");
  return result;
}

async function logoApi(method: "POST" | "DELETE", team: Team, logo?: File) {
  const body = new FormData();
  body.set("league", String(team.league));
  body.set("teamName", team.name);
  if (logo) body.set("logo", logo);
  const response = await fetch("/api/admin/team-logo", { method, body });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Nie udało się zapisać logo.");
  return result;
}

async function playerPhotoApi(playerId: number, photo: File) {
  const params = new URLSearchParams({ playerId: String(playerId), fileName: photo.name });
  const response = await fetch(`/api/admin/player-photo?${params}`, {
    method: "POST",
    headers: { "content-type": photo.type || "application/octet-stream" },
    body: photo,
  });
  const responseText = await response.text();
  let result: { error?: string } = {};
  try {
    result = responseText ? JSON.parse(responseText) as { error?: string } : {};
  } catch {
    // Preserve the HTTP status below when an intermediary returns a non-JSON response.
  }
  if (!response.ok) throw new Error(result.error || `Nie udało się zapisać zdjęcia (błąd ${response.status}).`);
  return result;
}

async function deletePlayerPhotoApi(playerId: number) {
  return api("/api/admin/player-photo", "DELETE", { playerId });
}

async function mediaApi(method: "POST" | "DELETE", kind: "team-cover" | "match" | "section", entityKey: string, photo?: File) {
  if (method === "DELETE") return api("/api/admin/media", "DELETE", { kind, entityKey });
  if (!photo) throw new Error("Nie wybrano zdjęcia.");
  const params = new URLSearchParams({ kind, entityKey, fileName: photo.name });
  const response = await fetch(`/api/admin/media?${params}`, {
    method: "POST",
    headers: { "content-type": photo.type || "application/octet-stream" },
    body: photo,
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || `Nie udało się zapisać zdjęcia (błąd ${response.status}).`);
  return result;
}

async function updateCoverPosition(entityKey: string, positionX: number, positionY: number) {
  return api("/api/admin/media", "PATCH", { kind: "team-cover", entityKey, positionX, positionY });
}

async function uploadGalleryPhotos(target: { albumId?: number; matchKey?: string }, files: File[]) {
  for (const photo of files) {
    const params = new URLSearchParams({ fileName: photo.name });
    if (target.albumId) params.set("albumId", String(target.albumId));
    if (target.matchKey) params.set("matchKey", target.matchKey);
    const response = await fetch(`/api/admin/gallery-photo?${params}`, { method: "POST", headers: { "content-type": photo.type || "application/octet-stream" }, body: photo });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || `Nie udało się zapisać pliku ${photo.name}.`);
  }
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <Button type="submit" disabled={busy}>{busy ? "Zapisywanie…" : children}</Button>;
}

export function AdminDashboard({ snapshot, user, signOutPath }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [teamEdit, setTeamEdit] = useState<Team | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [playerEdit, setPlayerEdit] = useState<Player | null>(null);
  const [matchEdit, setMatchEdit] = useState<LeagueMatch | null>(null);
  const [sectionEdit, setSectionEdit] = useState<SiteSection | null>(null);
  const [linkEdit, setLinkEdit] = useState<SiteLink | null>(null);
  const [newsEdit, setNewsEdit] = useState<NewsPost | null>(null);
  const [albumEdit, setAlbumEdit] = useState<GalleryAlbum | null>(null);
  const activeTeams = useMemo(() => snapshot.teams.filter((team) => team.active), [snapshot.teams]);
  const activePlayers = activeTeams.flatMap((team) =>
    team.players.filter((player) => player.active).map((player) => ({ ...player, teamName: team.name })),
  );
  const officialMatches = snapshot.officialMatches ?? snapshot.matches;
  const finished = officialMatches.filter((match) => match.status === "finished").length;

  function editTeam(team: Team) {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview("");
    setCoverPosition({ x: team.coverPositionX ?? 50, y: team.coverPositionY ?? 50 });
    setTeamEdit(team);
  }

  async function perform(message: string, action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      setTeamEdit(null);
      setPlayerEdit(null);
      setMatchEdit(null);
      setSectionEdit(null);
      setLinkEdit(null);
      setNewsEdit(null);
      setAlbumEdit(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać zmian.");
    } finally {
      setBusy(false);
    }
  }

  function fields(event: FormEvent<HTMLFormElement>) {
    return Object.fromEntries(new FormData(event.currentTarget).entries());
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link href="/" className="admin-brand">
          <img src="/assets/logo-kls.jpg" alt="Logo ligi" />
          <span>KLS <small>Panel ligi</small></span>
        </Link>
        <div className="admin-user">
          <span><strong>{user.displayName}</strong><small>{user.email}</small></span>
          <a href={signOutPath} aria-label="Wyloguj"><LogOut /></a>
        </div>
      </header>

      <div className="admin-wrap">
        <div className="admin-heading">
          <div><p className="eyebrow">Centrum zarządzania</p><h1>Panel administracyjny</h1><p>Aktualizacje są od razu widoczne w serwisie ligi.</p></div>
          <Link className="btn dark" href="/">Podgląd strony</Link>
        </div>

        <Tabs defaultValue="dashboard" className="admin-tabs">
          <TabsList className="admin-tablist">
            <TabsTrigger value="dashboard"><LayoutDashboard /> Pulpit</TabsTrigger>
            <TabsTrigger value="teams"><Trophy /> Drużyny</TabsTrigger>
            <TabsTrigger value="players"><UsersRound /> Zawodnicy</TabsTrigger>
            <TabsTrigger value="news"><Newspaper /> Aktualności</TabsTrigger>
            <TabsTrigger value="gallery"><Images /> Galeria</TabsTrigger>
            <TabsTrigger value="website"><PanelsTopLeft /> Strona</TabsTrigger>
            <TabsTrigger value="links"><Link2 /> Linki</TabsTrigger>
            <TabsTrigger value="matches"><FileSpreadsheet /> Arkusze</TabsTrigger>
            <TabsTrigger value="admins"><ShieldCheck /> Dostęp</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <section className="stat-grid">
              <article><Trophy /><strong>{activeTeams.length}</strong><span>aktywnych drużyn</span></article>
              <article><UsersRound /><strong>{activePlayers.length}</strong><span>aktywnych zawodników</span></article>
              <article><Swords /><strong>{finished}</strong><span>rozegranych meczów</span></article>
              <article><CalendarDays /><strong>{snapshot.season}</strong><span>bieżący sezon</span></article>
            </section>
            <section className="admin-card compact-form">
              <div><p className="eyebrow">Ustawienia</p><h2>Bieżący sezon</h2><p>Ta nazwa pojawia się w nagłówku oraz przy tabeli.</p></div>
              <form onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                perform("Zmieniono sezon.", () => api("/api/admin/settings", "PATCH", { season: data.season }));
              }}>
                <Label htmlFor="season">Sezon</Label>
                <Input id="season" name="season" defaultValue={snapshot.season} required />
                <SubmitButton busy={busy}>Zapisz sezon</SubmitButton>
              </form>
            </section>
          </TabsContent>

          <TabsContent value="teams">
            <section className="admin-split">
              <form className="admin-card admin-form" key={teamEdit?.id ?? "new-team"} onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                perform(teamEdit ? "Zapisano drużynę." : "Dodano drużynę.", () =>
                  api("/api/admin/teams", teamEdit ? "PATCH" : "POST", {
                    id: teamEdit?.id, league: Number(data.league), name: data.name, location: data.location,
                  }),
                );
              }}>
                <div><p className="eyebrow">{teamEdit ? "Edycja" : "Nowa pozycja"}</p><h2>{teamEdit ? teamEdit.name : "Dodaj drużynę"}</h2></div>
                <Label htmlFor="team-name">Nazwa</Label>
                <Input id="team-name" name="name" defaultValue={teamEdit?.name} required />
                <Label htmlFor="team-location">Miejscowość / parafia</Label>
                <Input id="team-location" name="location" defaultValue={teamEdit?.location} />
                <Label htmlFor="team-league">Liga</Label>
                <select id="team-league" name="league" defaultValue={teamEdit?.league ?? 1}><option value="1">KLS</option></select>
                {teamEdit && <div className="team-logo-editor">
                  <Label htmlFor="team-logo">Logo drużyny</Label>
                  <div className="team-logo-preview">{logoPreview || teamEdit.logoUrl ? <img src={logoPreview || teamEdit.logoUrl} alt={`Logo ${teamEdit.name}`} /> : <span>{teamEdit.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}</div>
                  <Input id="team-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    const file = event.target.files?.[0] ?? null;
                    setLogoFile(file);
                    setLogoPreview(file ? URL.createObjectURL(file) : "");
                  }} />
                  <small>PNG, JPG lub WebP, maksymalnie 3 MB. Najlepiej plik kwadratowy.</small>
                  <div className="form-actions">
                    <Button type="button" disabled={busy || !logoFile} onClick={() => logoFile && perform("Logo drużyny zostało zapisane.", () => logoApi("POST", teamEdit, logoFile))}><ImagePlus /> Zapisz logo</Button>
                    {teamEdit.logoUrl && <Button type="button" variant="outline" disabled={busy} onClick={() => perform("Logo drużyny zostało usunięte.", () => logoApi("DELETE", teamEdit))}><Trash2 /> Usuń logo</Button>}
                  </div>
                </div>}
                {teamEdit && <div className="team-cover-editor">
                  <Label>Zdjęcie całego składu / tło profilu</Label>
                  {teamEdit.coverUrl && <img className="admin-cover-preview" style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }} src={teamEdit.coverUrl} alt={`Zdjęcie składu ${teamEdit.name}`} />}
                  <label className="admin-photo-button"><ImagePlus size={16} />{teamEdit.coverUrl ? "Zmień zdjęcie składu" : "Dodaj zdjęcie składu"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => {
                    const photo = event.currentTarget.files?.[0];
                    if (photo) perform("Zdjęcie składu zostało zapisane.", () => mediaApi("POST", "team-cover", teamCoverMediaKey(teamEdit.league, teamEdit.name), photo));
                    event.currentTarget.value = "";
                  }} /></label>
                  {teamEdit.coverUrl && <Button type="button" variant="outline" disabled={busy} onClick={() => perform("Zdjęcie składu zostało usunięte.", () => mediaApi("DELETE", "team-cover", teamCoverMediaKey(teamEdit.league, teamEdit.name)))}><Trash2 /> Usuń zdjęcie składu</Button>}
                  {teamEdit.coverUrl && <div className="cover-position-controls">
                    <label>Przesunięcie poziome <input type="range" min="0" max="100" value={coverPosition.x} onChange={(event) => setCoverPosition((value) => ({ ...value, x: Number(event.target.value) }))} /></label>
                    <label>Przesunięcie pionowe <input type="range" min="0" max="100" value={coverPosition.y} onChange={(event) => setCoverPosition((value) => ({ ...value, y: Number(event.target.value) }))} /></label>
                    <Button type="button" disabled={busy} onClick={() => perform("Ustawienie kadru zostało zapisane.", () => updateCoverPosition(teamCoverMediaKey(teamEdit.league, teamEdit.name), coverPosition.x, coverPosition.y))}>Zapisz perspektywę</Button>
                  </div>}
                  <small>Najlepiej szerokie zdjęcie poziome, podobne do zdjęcia w tle na Facebooku. PNG, JPG lub WebP, do 8 MB.</small>
                </div>}
                <div className="form-actions">
                  <SubmitButton busy={busy}>{teamEdit ? "Zapisz" : "Dodaj"}</SubmitButton>
                  {teamEdit && <Button type="button" variant="outline" onClick={() => setTeamEdit(null)}>Anuluj</Button>}
                </div>
              </form>
              <section className="admin-card">
                <h2>Drużyny</h2>
                <div className="admin-list">{activeTeams.map((team) =>
                  <article key={team.id} className={!team.active ? "is-muted" : ""}>
                    <div><strong>{team.name}</strong><span>KLS · {team.location || "bez lokalizacji"} · {team.players.filter((p) => p.active).length} zawodników</span></div>
                    <div>
                      <Button size="sm" variant="outline" onClick={() => editTeam(team)}>Edytuj</Button>
                      {team.logoUrl && <Button size="sm" variant="ghost" disabled={busy} onClick={() => perform("Logo drużyny zostało usunięte.", () => logoApi("DELETE", team))}><Trash2 /> Usuń logo</Button>}
                      <Button size="sm" variant="ghost" onClick={() => perform(team.active ? "Drużyna została ukryta." : "Drużyna została przywrócona.", () => api("/api/admin/teams", "PATCH", { id: team.id, active: !team.active }))}>{team.active ? "Ukryj" : "Przywróć"}</Button>
                    </div>
                  </article>,
                )}</div>
              </section>
            </section>
          </TabsContent>

          <TabsContent value="players">
            <section className="admin-split">
              <form className="admin-card admin-form" key={playerEdit?.id ?? "new-player"} onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                perform(playerEdit ? "Zapisano zawodnika." : "Dodano zawodnika.", () =>
                  api("/api/admin/players", playerEdit ? "PATCH" : "POST", {
                    id: playerEdit?.id, teamId: Number(data.teamId), name: data.name, number: data.number, role: data.role,
                  }),
                );
              }}>
                <div><p className="eyebrow">Skład</p><h2>{playerEdit ? "Edytuj zawodnika" : "Dodaj zawodnika"}</h2></div>
                <Label htmlFor="player-team">Drużyna</Label>
                <select id="player-team" name="teamId" defaultValue={playerEdit?.teamId ?? activeTeams[0]?.id}>{activeTeams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select>
                <Label htmlFor="player-name">Imię i nazwisko</Label>
                <Input id="player-name" name="name" defaultValue={playerEdit?.name} required />
                <div className="form-pair">
                  <div><Label htmlFor="player-number">Numer</Label><Input id="player-number" name="number" type="number" min="0" max="99" defaultValue={playerEdit?.number ?? ""} /></div>
                  <div><Label htmlFor="player-role">Rola</Label><Input id="player-role" name="role" defaultValue={playerEdit?.role ?? "Zawodnik"} /></div>
                </div>
                <div className="form-actions">
                  <SubmitButton busy={busy}>{playerEdit ? "Zapisz" : "Dodaj"}</SubmitButton>
                  {playerEdit && <Button type="button" variant="outline" onClick={() => setPlayerEdit(null)}>Anuluj</Button>}
                </div>
              </form>
              <section className="admin-card">
                <h2>Aktualne składy</h2>
                <div className="admin-list">{activePlayers.map((player) =>
                  <article key={player.id}>
                    <div className="admin-player-summary">
                      <span><strong>{player.name}{player.number !== null ? ` · #${player.number}` : ""}</strong><small>{player.teamName} · {player.role}</small></span>
                    </div>
                    <div>
                      <Button size="sm" variant="outline" onClick={() => setPlayerEdit(player)}>Edytuj</Button>
                      <Button size="sm" variant="ghost" onClick={() => perform("Zawodnik został usunięty ze składu.", () => api("/api/admin/players", "DELETE", { id: player.id }))}>Usuń</Button>
                    </div>
                  </article>,
                )}</div>
              </section>
            </section>
          </TabsContent>

          <TabsContent value="news">
            <section className="admin-split">
              <form className="admin-card admin-form" key={newsEdit?.id ?? "new-news"} onSubmit={(event) => {
                event.preventDefault(); const data = fields(event);
                perform(newsEdit ? "Aktualność została zapisana." : "Aktualność została opublikowana.", () => api("/api/admin/news", newsEdit ? "PATCH" : "POST", {
                  id: newsEdit?.id, title: data.title, body: data.body, linkLabel: data.linkLabel, linkUrl: data.linkUrl, publishedAt: data.publishedAt,
                }));
              }}>
                <div><p className="eyebrow">NA BIEŻĄCO</p><h2>{newsEdit ? "Edytuj aktualność" : "Dodaj aktualność"}</h2></div>
                <Label htmlFor="news-title">Tytuł</Label><Input id="news-title" name="title" defaultValue={newsEdit?.title} required />
                <Label htmlFor="news-body">Treść</Label><textarea id="news-body" name="body" rows={7} defaultValue={newsEdit?.body} required />
                <Label htmlFor="news-date">Data publikacji</Label><Input id="news-date" name="publishedAt" type="date" defaultValue={newsEdit?.publishedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required />
                <div className="form-pair"><div><Label htmlFor="news-link-label">Tekst linku</Label><Input id="news-link-label" name="linkLabel" placeholder="np. Zobacz komunikat" defaultValue={newsEdit?.linkLabel} /></div><div><Label htmlFor="news-link-url">Adres linku</Label><Input id="news-link-url" name="linkUrl" placeholder="https://…" defaultValue={newsEdit?.linkUrl} /></div></div>
                <div className="form-actions"><SubmitButton busy={busy}>{newsEdit ? "Zapisz" : "Opublikuj"}</SubmitButton>{newsEdit && <Button type="button" variant="outline" onClick={() => setNewsEdit(null)}>Anuluj</Button>}</div>
              </form>
              <section className="admin-card"><h2>Opublikowane informacje</h2><div className="admin-list">{snapshot.newsPosts.map((post) => <article key={post.id} className={!post.visible ? "is-muted" : ""}><div><strong>{post.title}</strong><span>{post.publishedAt.slice(0, 10)}{post.linkUrl ? " · zawiera link" : ""}</span></div><div><Button size="sm" variant="outline" onClick={() => setNewsEdit(post)}>Edytuj</Button><Button size="sm" variant="ghost" onClick={() => perform(post.visible ? "Aktualność została ukryta." : "Aktualność została pokazana.", () => api("/api/admin/news", "PATCH", { id: post.id, visible: !post.visible }))}>{post.visible ? "Ukryj" : "Pokaż"}</Button><Button size="sm" variant="ghost" onClick={() => perform("Aktualność została usunięta.", () => api("/api/admin/news", "DELETE", { id: post.id }))}><Trash2 /> Usuń</Button></div></article>)}</div></section>
            </section>
          </TabsContent>

          <TabsContent value="gallery">
            <section className="admin-split">
              <form className="admin-card admin-form" key={albumEdit?.id ?? "new-album"} onSubmit={(event) => {
                event.preventDefault(); const data = fields(event);
                perform(albumEdit ? "Album został zapisany." : "Album został dodany.", () => api("/api/admin/gallery", albumEdit ? "PATCH" : "POST", { id: albumEdit?.id, name: data.name, description: data.description, sortOrder: Number(data.sortOrder) }));
              }}>
                <div><p className="eyebrow">GALERIA</p><h2>{albumEdit ? `Edytuj: ${albumEdit.name}` : "Dodaj album"}</h2><p>Każdy album może dotyczyć innego rodzaju wydarzeń, np. meczów, finałów lub turniejów charytatywnych.</p></div>
                <Label htmlFor="album-name">Nazwa albumu</Label><Input id="album-name" name="name" defaultValue={albumEdit?.name} required />
                <Label htmlFor="album-description">Opis</Label><textarea id="album-description" name="description" rows={5} defaultValue={albumEdit?.description} />
                <Label htmlFor="album-order">Kolejność</Label><Input id="album-order" name="sortOrder" type="number" min="0" max="1000" defaultValue={albumEdit?.sortOrder ?? 100} />
                <div className="form-actions"><SubmitButton busy={busy}>{albumEdit ? "Zapisz album" : "Dodaj album"}</SubmitButton>{albumEdit && <Button type="button" variant="outline" onClick={() => setAlbumEdit(null)}>Zakończ edycję</Button>}</div>
                {albumEdit && <div className="album-photo-editor"><Label>Dodaj wiele zdjęć</Label><input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const photos = Array.from(event.currentTarget.files ?? []); if (photos.length) perform(`Dodano ${photos.length} zdjęć.`, () => uploadGalleryPhotos({ albumId: albumEdit.id }, photos)); event.currentTarget.value = ""; }} />
                  <div className="admin-photo-grid">{albumEdit.photos.map((photo) => <article key={photo.id}><img src={photo.url} alt="" /><div><Button type="button" size="sm" variant="outline" onClick={() => perform("Przesunięto zdjęcie.", () => api("/api/admin/gallery-photo", "PATCH", { id: photo.id, direction: "up" }))}><ArrowUp /></Button><Button type="button" size="sm" variant="outline" onClick={() => perform("Przesunięto zdjęcie.", () => api("/api/admin/gallery-photo", "PATCH", { id: photo.id, direction: "down" }))}><ArrowDown /></Button><Button type="button" size="sm" variant="ghost" onClick={() => perform("Zdjęcie zostało usunięte.", () => api("/api/admin/gallery-photo", "DELETE", { id: photo.id }))}><Trash2 /></Button></div></article>)}</div>
                </div>}
              </form>
              <section className="admin-card"><h2>Albumy galerii</h2><div className="admin-list">{snapshot.galleryAlbums.map((album) => <article key={album.id} className={!album.visible ? "is-muted" : ""}><div><strong>{album.name}</strong><span>{album.photos.length} zdjęć · kolejność {album.sortOrder}</span></div><div><Button size="sm" variant="outline" onClick={() => setAlbumEdit(album)}>Edytuj i dodaj zdjęcia</Button><Button size="sm" variant="ghost" onClick={() => perform(album.visible ? "Album został ukryty." : "Album został pokazany.", () => api("/api/admin/gallery", "PATCH", { id: album.id, visible: !album.visible }))}>{album.visible ? "Ukryj" : "Pokaż"}</Button><Button size="sm" variant="ghost" onClick={() => perform("Album został usunięty.", () => api("/api/admin/gallery", "DELETE", { id: album.id }))}><Trash2 /> Usuń</Button></div></article>)}</div></section>
            </section>
          </TabsContent>

          <TabsContent value="website">
            <section className="admin-split">
              <form className="admin-card admin-form" key={sectionEdit?.id ?? "new-section"} onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                perform(sectionEdit ? "Zapisano sekcję." : "Dodano sekcję.", () =>
                  api("/api/admin/content", sectionEdit ? "PATCH" : "POST", {
                    id: sectionEdit?.id,
                    navLabel: data.navLabel,
                    eyebrow: data.eyebrow,
                    title: data.title,
                    body: data.body,
                    layout: data.layout,
                    sortOrder: Number(data.sortOrder),
                  }),
                );
              }}>
                <div><p className="eyebrow">Układ strony</p><h2>{sectionEdit ? "Edytuj sekcję" : "Dodaj zakładkę"}</h2><p>Nazwa zakładki pojawi się w menu. Kolejność określa jej miejsce na stronie.</p></div>
                <Label htmlFor="section-nav">Nazwa w menu</Label><Input id="section-nav" name="navLabel" defaultValue={sectionEdit?.navLabel} required />
                <Label htmlFor="section-eyebrow">Mały nagłówek</Label><Input id="section-eyebrow" name="eyebrow" defaultValue={sectionEdit?.eyebrow} />
                <Label htmlFor="section-title">Tytuł</Label><Input id="section-title" name="title" defaultValue={sectionEdit?.title} required />
                <Label htmlFor="section-body">Treść</Label><textarea id="section-body" name="body" rows={5} defaultValue={sectionEdit?.body} />
                <div className="form-pair">
                  <div><Label htmlFor="section-layout">Układ</Label><select id="section-layout" name="layout" defaultValue={sectionEdit?.layout ?? "standard"}><option value="standard">Standardowy</option><option value="split">Dwie kolumny</option><option value="banner">Baner</option></select></div>
                  <div><Label htmlFor="section-order">Kolejność</Label><Input id="section-order" name="sortOrder" type="number" min="0" max="1000" defaultValue={sectionEdit?.sortOrder ?? 100} /></div>
                </div>
                <div className="form-actions"><SubmitButton busy={busy}>{sectionEdit ? "Zapisz" : "Dodaj zakładkę"}</SubmitButton>{sectionEdit && <Button type="button" variant="outline" onClick={() => setSectionEdit(null)}>Anuluj</Button>}</div>
              </form>
              <section className="admin-card">
                <h2>Zakładki i sekcje</h2>
                <div className="admin-list">{snapshot.sections.map((item) =>
                  <article key={item.id} className={!item.visible ? "is-muted" : ""}>
                    <div><strong>{item.navLabel}</strong><span>{item.kind === "system" ? "sekcja systemowa" : "własna sekcja"} · kolejność {item.sortOrder} · {item.layout}{item.imageUrl ? " · ma zdjęcie" : ""}</span></div>
                    <div>
                      <label className="admin-photo-button"><ImagePlus size={16} />Zdjęcie<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => {
                        const photo = event.currentTarget.files?.[0];
                        if (photo) perform("Zdjęcie zakładki zostało zapisane.", () => mediaApi("POST", "section", sectionMediaKey(item.sectionKey), photo));
                        event.currentTarget.value = "";
                      }} /></label>
                      {item.imageUrl && <Button size="sm" variant="ghost" disabled={busy} onClick={() => perform("Zdjęcie zakładki zostało usunięte.", () => mediaApi("DELETE", "section", sectionMediaKey(item.sectionKey)))}><Trash2 /> Usuń zdjęcie</Button>}
                      <Button size="sm" variant="outline" onClick={() => setSectionEdit(item)}>Edytuj</Button><Button size="sm" variant="ghost" onClick={() => perform(item.visible ? "Sekcja została ukryta." : "Sekcja została pokazana.", () => api("/api/admin/content", "PATCH", { id: item.id, visible: !item.visible }))}>{item.visible ? "Ukryj" : "Pokaż"}</Button>{item.kind === "custom" && <Button size="sm" variant="ghost" onClick={() => perform("Sekcja została usunięta.", () => api("/api/admin/content", "DELETE", { id: item.id }))}>Usuń</Button>}
                    </div>
                  </article>,
                )}</div>
              </section>
            </section>
          </TabsContent>

          <TabsContent value="links">
            <section className="admin-split">
              <form className="admin-card admin-form" key={linkEdit?.id ?? "new-link"} onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                perform(linkEdit ? "Zapisano link." : "Dodano link.", () =>
                  api("/api/admin/links", linkEdit ? "PATCH" : "POST", {
                    id: linkEdit?.id, label: data.label, url: data.url, location: data.location, sortOrder: Number(data.sortOrder),
                  }),
                );
              }}>
                <div><p className="eyebrow">Odnośniki</p><h2>{linkEdit ? "Edytuj link" : "Dodaj link"}</h2></div>
                <Label htmlFor="link-label">Nazwa</Label><Input id="link-label" name="label" defaultValue={linkEdit?.label} required />
                <Label htmlFor="link-url">Adres</Label><Input id="link-url" name="url" placeholder="https://… lub mailto:…" defaultValue={linkEdit?.url} required />
                <div className="form-pair">
                  <div><Label htmlFor="link-location">Miejsce</Label><select id="link-location" name="location" defaultValue={linkEdit?.location ?? "footer"}><option value="footer">Stopka</option><option value="social">Social media</option></select></div>
                  <div><Label htmlFor="link-order">Kolejność</Label><Input id="link-order" name="sortOrder" type="number" defaultValue={linkEdit?.sortOrder ?? 100} /></div>
                </div>
                <div className="form-actions"><SubmitButton busy={busy}>{linkEdit ? "Zapisz" : "Dodaj link"}</SubmitButton>{linkEdit && <Button type="button" variant="outline" onClick={() => setLinkEdit(null)}>Anuluj</Button>}</div>
              </form>
              <section className="admin-card"><h2>Linki na stronie</h2><div className="admin-list">{snapshot.links.map((item) =>
                <article key={item.id} className={!item.visible ? "is-muted" : ""}><div><strong>{item.label}</strong><span>{item.location === "social" ? "social media" : "stopka"} · {item.url}</span></div><div><Button size="sm" variant="outline" onClick={() => setLinkEdit(item)}>Edytuj</Button><Button size="sm" variant="ghost" onClick={() => perform(item.visible ? "Link został ukryty." : "Link został pokazany.", () => api("/api/admin/links", "PATCH", { id: item.id, visible: !item.visible }))}>{item.visible ? "Ukryj" : "Pokaż"}</Button><Button size="sm" variant="ghost" onClick={() => perform("Link został usunięty.", () => api("/api/admin/links", "DELETE", { id: item.id }))}>Usuń</Button></div></article>,
              )}</div></section>
            </section>
          </TabsContent>

          <TabsContent value="matches">
            <section className="admin-card sheet-source-card">
              <div><p className="eyebrow">Źródło oficjalnych danych</p><h2>Arkusze Google</h2><p>Tabela, mecze do rozegrania i rozegrane są pobierane automatycznie. Wyniki wpisuj nadal w arkuszach.</p></div>
              <div className="sheet-source-grid">{[1].map((league) => {
                const source = snapshot.dataSource.leagues[String(league)];
                return <article key={league}><strong>{league} liga</strong><span>{source.rows} pozycji w tabeli · {source.matches} meczów</span>{source.url && <a className="btn dark" href={source.url} target="_blank" rel="noopener">Otwórz arkusz</a>}</article>;
              })}</div>
              <p className={snapshot.dataSource.mode === "google-sheets" ? "sync-status ok" : "sync-status warning"}>{snapshot.dataSource.mode === "google-sheets" ? "Połączenie działa — dane są aktualne." : snapshot.dataSource.mode === "mixed" ? "Jedna z lig jest pobierana z Arkuszy Google, a druga korzysta z kopii zapasowej." : "Arkusze są chwilowo niedostępne — strona pokazuje kopię zapasową."}</p>
            </section>
            <section className="admin-card">
              <div><p className="eyebrow">GALERIA MECZÓW</p><h2>Zdjęcia do konkretnych spotkań</h2><p>Lista pochodzi z oficjalnych Arkuszy Google. Zdjęcie pojawi się przy właściwym meczu na stronie.</p></div>
              <div className="admin-list match-photo-list">{(snapshot.officialMatches ?? snapshot.matches).map((match) =>
                <article key={`${match.league}-${match.id}`}>
                  <div><strong>{match.homeTeam} — {match.awayTeam}</strong><span>{match.displayDate || match.matchDate.replace("T", " ")} · KLS · {match.photos?.length ?? 0} zdjęć</span></div>
                  <div>
                    <label className="admin-photo-button"><ImagePlus size={16} />Dodaj zdjęcia<input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => {
                      const photos = Array.from(event.currentTarget.files ?? []);
                      if (photos.length) perform(`Dodano ${photos.length} zdjęć do meczu.`, () => uploadGalleryPhotos({ matchKey: matchMediaKey(match) }, photos));
                      event.currentTarget.value = "";
                    }} /></label>
                    {match.imageUrl && <Button size="sm" variant="ghost" disabled={busy} onClick={() => perform("Starsze zdjęcie meczu zostało usunięte.", () => mediaApi("DELETE", "match", matchMediaKey(match)))}><Trash2 /> Usuń starsze zdjęcie</Button>}
                  </div>
                  {!!match.photos?.length && <div className="match-admin-photos">{match.photos.map((photo) => <span key={photo.id}><img src={photo.url} alt="" /><i><Button size="sm" variant="outline" onClick={() => perform("Przesunięto zdjęcie.", () => api("/api/admin/gallery-photo", "PATCH", { id: photo.id, direction: "up" }))}><ArrowUp /></Button><Button size="sm" variant="outline" onClick={() => perform("Przesunięto zdjęcie.", () => api("/api/admin/gallery-photo", "PATCH", { id: photo.id, direction: "down" }))}><ArrowDown /></Button><Button size="sm" variant="ghost" onClick={() => perform("Zdjęcie zostało usunięte.", () => api("/api/admin/gallery-photo", "DELETE", { id: photo.id }))}><Trash2 /></Button></i></span>)}</div>}
                </article>,
              )}</div>
            </section>
            <details className="admin-backup">
              <summary>Awaryjna kopia danych w panelu</summary>
            <section className="admin-split match-layout">
              <form className="admin-card admin-form" key={matchEdit?.id ?? "new-match"} onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                const scores = String(data.setScores || "").split(",").map((value) => value.trim()).filter(Boolean);
                perform(matchEdit ? "Zapisano mecz." : "Dodano mecz.", () =>
                  api("/api/admin/matches", matchEdit ? "PATCH" : "POST", {
                    id: matchEdit?.id, league: Number(data.league), matchDate: data.matchDate,
                    homeTeamId: Number(data.homeTeamId), awayTeamId: Number(data.awayTeamId), venue: data.venue,
                    status: data.status, homeSets: Number(data.homeSets || 0), awaySets: Number(data.awaySets || 0),
                    setScores: scores, published: data.published === "on",
                  }),
                );
              }}>
                <div><p className="eyebrow">Terminarz i wyniki</p><h2>{matchEdit ? "Edytuj mecz" : "Dodaj mecz"}</h2></div>
                <div className="form-pair">
                  <div><Label htmlFor="match-league">Liga</Label><select id="match-league" name="league" defaultValue={matchEdit?.league ?? 1}><option value="1">KLS</option></select></div>
                  <div><Label htmlFor="match-date">Data i godzina</Label><Input id="match-date" name="matchDate" type="datetime-local" defaultValue={matchEdit?.matchDate.slice(0, 16)} required /></div>
                </div>
                <Label htmlFor="home-team">Gospodarz</Label>
                <select id="home-team" name="homeTeamId" defaultValue={matchEdit?.homeTeamId ?? activeTeams[0]?.id}>{activeTeams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select>
                <Label htmlFor="away-team">Gość</Label>
                <select id="away-team" name="awayTeamId" defaultValue={matchEdit?.awayTeamId ?? activeTeams[1]?.id}>{activeTeams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select>
                <Label htmlFor="venue">Miejsce</Label>
                <Input id="venue" name="venue" defaultValue={matchEdit?.venue} />
                <div className="form-pair">
                  <div><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={matchEdit?.status ?? "scheduled"}><option value="scheduled">Zaplanowany</option><option value="finished">Zakończony</option></select></div>
                  <div className="score-fields">
                    <div><Label htmlFor="home-sets">Sety gosp.</Label><Input id="home-sets" name="homeSets" type="number" min="0" max="3" defaultValue={matchEdit?.homeSets ?? 0} /></div>
                    <div><Label htmlFor="away-sets">Sety gości</Label><Input id="away-sets" name="awaySets" type="number" min="0" max="3" defaultValue={matchEdit?.awaySets ?? 0} /></div>
                  </div>
                </div>
                <Label htmlFor="set-scores">Wyniki setów</Label>
                <Input id="set-scores" name="setScores" placeholder="25:20, 23:25, 25:18" defaultValue={matchEdit?.setScores.join(", ")} />
                <label className="check-row"><input name="published" type="checkbox" defaultChecked={matchEdit?.published ?? true} /> Opublikuj na stronie</label>
                <div className="form-actions">
                  <SubmitButton busy={busy}>{matchEdit ? "Zapisz" : "Dodaj"}</SubmitButton>
                  {matchEdit && <Button type="button" variant="outline" onClick={() => setMatchEdit(null)}>Anuluj</Button>}
                </div>
              </form>
              <section className="admin-card">
                <h2>Mecze</h2>
                <div className="admin-list">{snapshot.matches.map((match) =>
                  <article key={match.id} className={!match.published ? "is-muted" : ""}>
                    <div><strong>{match.homeTeam} {match.status === "finished" ? `${match.homeSets}:${match.awaySets}` : "—"} {match.awayTeam}</strong><span>{match.matchDate.replace("T", " ")} · KLS{!match.published ? " · ukryty" : ""}</span></div>
                    <div>
                      <Button size="sm" variant="outline" onClick={() => setMatchEdit(match)}>Edytuj</Button>
                      <Button size="sm" variant="ghost" onClick={() => perform("Mecz został usunięty.", () => api("/api/admin/matches", "DELETE", { id: match.id }))}>Usuń</Button>
                    </div>
                  </article>,
                )}</div>
              </section>
            </section>
            </details>
          </TabsContent>

          <TabsContent value="admins">
            <section className="admin-split">
              <form className="admin-card admin-form" onSubmit={(event) => {
                event.preventDefault();
                const data = fields(event);
                perform("Nadano dostęp administratora.", () =>
                  api("/api/admin/admins", "POST", { email: data.email, displayName: data.displayName }),
                );
              }}>
                <div><p className="eyebrow">Uprawnienia</p><h2>Dodaj administratora</h2><p>Wpisz adres e-mail jego konta ChatGPT.</p></div>
                <Label htmlFor="admin-name">Nazwa</Label>
                <Input id="admin-name" name="displayName" placeholder="np. Sekretariat ligi" />
                <Label htmlFor="admin-email">E-mail</Label>
                <Input id="admin-email" name="email" type="email" required />
                <SubmitButton busy={busy}>Nadaj dostęp</SubmitButton>
                <p className="form-note">Osoba musi mieć również dostęp do samej witryny. Właściciel strony może dodać ją do listy odbiorców.</p>
              </form>
              <section className="admin-card">
                <h2>Uprawnione osoby</h2>
                <div className="admin-list">
                  <article><div><strong>{user.displayName}</strong><span>{user.email} · właściciel</span></div></article>
                  {snapshot.admins.map((admin) =>
                    <article key={admin.id}>
                      <div><strong>{admin.displayName || "Administrator"}</strong><span>{admin.email}</span></div>
                      <Button size="sm" variant="ghost" onClick={() => perform("Odebrano dostęp administratora.", () => api("/api/admin/admins", "DELETE", { id: admin.id }))}>Usuń</Button>
                    </article>,
                  )}
                </div>
              </section>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
