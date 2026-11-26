import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getBunnyServerConfig, verifyFirebaseRequestAuth } from '@/lib/server-security';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { libraryId, apiKey, cdnHostname } = getBunnyServerConfig();
    if (!libraryId || !apiKey) {
      return NextResponse.json(
        { error: 'Video upload service is not configured on the server.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawTitle = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
    const videoTitle = rawTitle || `Lesson - ${new Date().toLocaleDateString('ar-EG')}`;

    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        AccessKey: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ title: videoTitle }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Failed to create Bunny video:', createRes.status, errText);
      return NextResponse.json(
        { error: `Video provider error (${createRes.status}).` },
        { status: createRes.status }
      );
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    const expireTime = Math.floor(Date.now() / 1000) + 86400;
    const signature = crypto
      .createHash('sha256')
      .update(`${libraryId}${apiKey}${expireTime}${videoId}`)
      .digest('hex');

    const safeCdn = cdnHostname || 'vz-7dc30faa-b42.b-cdn.net';
    const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
    const thumbnailUrl = `https://${safeCdn}/${videoId}/thumbnail.jpg`;
    const directPlaybackUrl = `https://${safeCdn}/${videoId}/playlist.m3u8`;

    return NextResponse.json({
      success: true,
      videoId,
      libraryId,
      title: videoData.title || videoTitle,
      embedUrl,
      thumbnailUrl,
      directPlaybackUrl,
      tus: {
        endpoint: 'https://video.bunnycdn.com/tusupload',
        signature,
        expire: expireTime,
      },
    });
  } catch (error: any) {
    console.error('Error creating Bunny video upload:', error);
    return NextResponse.json(
      { error: 'Internal server error creating video upload.' },
      { status: 500 }
    );
  }
}
