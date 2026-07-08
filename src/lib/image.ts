// Client-side image rotation. The app otherwise uploads raw camera files untouched;
// this is the one place we re-encode, so users can fix a photo's orientation before
// it's stored. Rotating goes through a <canvas>, which also bakes in EXIF orientation
// and normalises HEIC -> JPEG (a bonus for cross-browser display).

export type Rotation = 0 | 90 | 180 | 270;

/** Next 90° clockwise step, wrapping back to 0 after 270. */
export function nextRotation(r: Rotation): Rotation {
  return ((r + 90) % 360) as Rotation;
}

/** 90° and 270° swap the image's width and height. */
export function swapsDimensions(deg: Rotation): boolean {
  return deg === 90 || deg === 270;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Return a new File with the image rotated `degrees` clockwise, re-encoded as JPEG.
 * `0` returns the original unchanged (no re-encode). Falls back to the original if the
 * browser can't decode/encode it (e.g. HEIC on Chrome), so a rotate can never lose the photo.
 */
export async function rotateImageFile(file: File, degrees: Rotation): Promise<File> {
  if (degrees === 0) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    const swap = swapsDimensions(degrees);
    canvas.width = swap ? img.naturalHeight : img.naturalWidth;
    canvas.height = swap ? img.naturalWidth : img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
