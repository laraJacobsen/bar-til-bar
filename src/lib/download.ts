// Cross-origin URLs (R2's public bucket domain) ignore the <a download> attribute in
// most browsers — fetch the image as a blob first so the download is same-origin (blob:).
export async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
