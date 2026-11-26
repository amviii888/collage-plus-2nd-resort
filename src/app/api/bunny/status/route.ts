import { NextRequest, NextResponse } from 'next/server';
import { getBunnyServerConfig, verifyFirebaseRequestAuth } from '@/lib/server-security';

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;

export async function GET(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { libraryId, apiKey, cdnHostname } = getBunnyServerConfig();
    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Video status service is not configured.' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get('videoId') || '').trim();

    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
      return NextResponse.json({ error: 'Valid videoId is required.' }, { status: 400 });
    }

    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: {
        AccessKey: apiKey,
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Video status lookup failed (${res.status}).` }, { status: res.status });
    }

    const video = await res.json();
    const statusMap: Record<number, string> = {
      0: 'created',
      1: 'uploaded',
      2: 'processing',
      3: 'transcoding',
      4: 'ready',
      5: 'error',
      6: 'failed',
    };

    const safeCdn = cdnHostname || 'vz-7dc30faa-b42.b-cdn.net';

    return NextResponse.json({
      success: true,
      videoId: video.guid,
      title: video.title,
      statusCode: video.status,
      status: statusMap[video.status] || 'unknown',
      encodeProgress: video.encodeProgress ?? (video.status === 4 ? 100 : 0),
      duration: video.length || 0,
      width: video.width || 0,
      height: video.height || 0,
      availableResolutions: video.availableResolutions || [],
      thumbnailUrl: `https://${safeCdn}/${video.guid}/thumbnail.jpg`,
      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${video.guid}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`,
      directPlaybackUrl: `https://${safeCdn}/${video.guid}/playlist.m3u8`,
    });
  } catch (error: any) {
    console.error('Error fetching Bunny video status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status.' },
      { status: 500 }
    );
  }
}
