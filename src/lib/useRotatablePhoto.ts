'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { rotateImageFile, nextRotation, type Rotation } from '@/lib/image';

/**
 * Owns a captured photo's lifecycle: object-URL preview, 90° rotation, and the File to
 * upload. Rotation always re-derives from the ORIGINAL file so repeated taps don't
 * compound JPEG loss. `outputFile` is what callers upload; `previewUrl` is always an
 * object URL of that exact file (WYSIWYG — no CSS transforms needed).
 */
export function useRotatablePhoto() {
  const originalRef = useRef<File | null>(null);
  const urlRef = useRef('');
  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [rotating, setRotating] = useState(false);

  const swapUrl = useCallback((file: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const next = file ? URL.createObjectURL(file) : '';
    urlRef.current = next;
    setPreviewUrl(next);
  }, []);

  // Revoke the last object URL on unmount.
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const setSource = useCallback((file: File) => {
    originalRef.current = file;
    setRotation(0);
    setOutputFile(file); // rotation 0 → upload the original untouched
    swapUrl(file);
  }, [swapUrl]);

  const rotate = useCallback(async () => {
    const original = originalRef.current;
    if (!original || rotating) return;
    const next = nextRotation(rotation);
    setRotating(true);
    try {
      const rotated = await rotateImageFile(original, next);
      setRotation(next);
      setOutputFile(rotated);
      swapUrl(rotated);
    } finally {
      setRotating(false);
    }
  }, [rotation, rotating, swapUrl]);

  const reset = useCallback(() => {
    originalRef.current = null;
    setRotation(0);
    setOutputFile(null);
    swapUrl(null);
  }, [swapUrl]);

  return { setSource, rotate, reset, rotation, rotating, previewUrl, outputFile, hasPhoto: !!outputFile };
}
