import { NextRequest, NextResponse } from 'next/server';

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string;
    const challengeId = formData.get('challengeId') as string;
    const idToken = formData.get('idToken') as string;

    if (!file || !groupId || !challengeId || !idToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const path = `submissions/${groupId}/${challengeId}-${Date.now()}.jpg`;
    const encodedPath = encodeURIComponent(path);

    const uploadRes = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${encodedPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Firebase ${idToken}`,
          'Content-Type': file.type || 'image/jpeg',
        },
        body: await file.arrayBuffer(),
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`Storage upload failed (${uploadRes.status}): ${text}`);
    }

    const data = await uploadRes.json();
    const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media&token=${data.downloadTokens}`;

    return NextResponse.json({ photoUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
