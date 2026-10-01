export async function prepareTeamLogo(file: File): Promise<File> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Wybierz logo PNG, JPG lub WebP.");
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error("Wybierz plik logo do 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("Nie można odczytać tego obrazu."); });
    const ratio = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Przeglądarka nie może przygotować logo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error("Nie udało się przygotować logo.")), "image/png"));
    if (blob.size > 3 * 1024 * 1024) throw new Error("Nie udało się zmniejszyć logo. Wybierz mniejszy plik.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
