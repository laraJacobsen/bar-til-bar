import { NextRequest, NextResponse } from 'next/server';

// Same-origin download proxy. The browser blocks a cross-origin fetch of the R2 public
// URL (and ignores <a download> across origins), so a client-side "fetch → blob → save"
// silently fails. Instead we stream the image back through our own origin with an
// attachment disposition, which forces a real download and needs no R2 CORS.
// Restricted to the configured R2 public base so this can't be used to fetch arbitrary hosts.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const name = (request.nextUrl.searchParams.get('name') || 'photo.jpg').replace(/[^\w.\-]/g, '_');
  const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');

  if (!url || !base || !url.startsWith(base + '/')) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
