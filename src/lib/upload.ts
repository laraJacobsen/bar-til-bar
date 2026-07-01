// Client-side helper: request a presigned URL, then PUT the file directly to R2.
// Returns the public URL to store in Firestore.

type UploadParams =
  | { kind: 'submission'; groupId: string; challengeId: string }
  | { kind: 'group-picture'; groupId: string }
  | { kind: 'profile-picture'; userId: string };

export async function uploadToR2(file: File, params: UploadParams): Promise<string> {
  const presignRes = await fetch('/api/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, contentType: file.type }),
  });
  if (!presignRes.ok) {
    throw new Error('Failed to get upload URL');
  }
  const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string };

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!putRes.ok) {
    throw new Error('Upload to storage failed');
  }

  return publicUrl;
}
