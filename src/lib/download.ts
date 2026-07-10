// A client-side fetch of the R2 public URL is blocked by CORS (and cross-origin
// <a download> is ignored), so go through our same-origin proxy, which streams the
// image back with an attachment disposition — a real download with no CORS dependency.
export function downloadImage(url: string, filename: string): void {
  const href = `/api/r2/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
