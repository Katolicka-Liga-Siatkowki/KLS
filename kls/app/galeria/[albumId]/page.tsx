import { notFound } from "next/navigation";
import { LeagueSite } from "@/components/league-site";
import { getLeagueSnapshot } from "@/lib/league-data";

export const dynamic = "force-dynamic";

export default async function GalleryAlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const id = Number(albumId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const snapshot = await getLeagueSnapshot();
  if (!snapshot.galleryAlbums.some((album) => album.id === id && album.visible)) notFound();
  return <LeagueSite snapshot={snapshot} page="gallery-album" galleryAlbumId={id} />;
}
