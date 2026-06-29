import { NextRequest, NextResponse } from 'next/server';
import { presignUpload, publicUrl } from '@/lib/r2';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kind, groupId, challengeId, contentType } = body as {
      kind?: 'submission' | 'group-picture';
      groupId?: string;
      challengeId?: string;
      contentType?: string;
    };

    if (!kind || !groupId || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    const timestamp = Date.now();
    let key: string;
    if (kind === 'submission') {
      if (!challengeId) {
        return NextResponse.json({ error: 'Missing challengeId' }, { status: 400 });
      }
      key = `submissions/${groupId}/${challengeId}-${timestamp}.jpg`;
    } else if (kind === 'group-picture') {
      key = `group-pictures/${groupId}/picture-${timestamp}.jpg`;
    } else {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const uploadUrl = await presignUpload(key, contentType);
    return NextResponse.json({ uploadUrl, publicUrl: publicUrl(key), key });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}
