import { NextRequest, NextResponse } from 'next/server';
import { getBunnyServerConfig, verifyFirebaseRequestAuth } from '@/lib/server-security';

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { libraryId, apiKey, cdnHostname } = getBunnyServerConfig();
    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Video upload service is not configured.' }, { status: 503 });
    }

    const { videoId } = await context.params;
    const cleanVideoId = (videoId || '').trim();

    if (!cleanVideoId || !VIDEO_ID_REGEX.test(cleanVideoId)) {
      return NextResponse.json({ error: 'Valid videoId is required.' }, { status: 400 });
    }

    if (!req.body) {
      return NextResponse.json({ error: 'No video payload received.' }, { status: 400 });
    }

    const bunnyRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${encodeURIComponent(cleanVideoId)}`,
      {
        method: 'PUT',
        headers: {
          AccessKey: apiKey,
          'Content-Type': 'application/octet-stream',
        },
        // @ts-ignore
        body: req.body,
        duplex: 'half',
      }
    );

    if (!bunnyRes.ok) {
      return NextResponse.json(
        { error: `Video upload failed (${bunnyRes.status}).` },
        { status: bunnyRes.status }
      );
    }

    const data = await bunnyRes.json().catch(() => ({ success: true }));
    const safeCdn = cdnHostname || 'vz-7dc30faa-b42.b-cdn.net';

    return NextResponse.json({
      success: true,
      videoId: cleanVideoId,
      data,
      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`,
      thumbnailUrl: `https://${safeCdn}/${cleanVideoId}/thumbnail.jpg`,
    });
  } catch (error: any) {
    console.error('Error proxying Bunny upload:', error);
    return NextResponse.json(
      { error: 'Failed to upload video.' },
      { status: 500 }
    );
  }
}
