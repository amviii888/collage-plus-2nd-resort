import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getBunnyServerConfig, verifyFirebaseRequestAuth } from '@/lib/server-security';

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;

export async function GET(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { libraryId, tokenKey, cdnHostname } = getBunnyServerConfig();
    if (!libraryId) {
      return NextResponse.json({ error: 'Video playback service is not configured.' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const cleanVideoId = videoId.replace(/^bunny:/i, '').trim();
    if (!VIDEO_ID_REGEX.test(cleanVideoId)) {
      return NextResponse.json({ error: 'Invalid videoId format.' }, { status: 400 });
    }

    const expires = Math.floor(Date.now() / 1000) + 21600;
    let token = '';

    if (tokenKey) {
      token = crypto
        .createHash('sha256')
        .update(`${tokenKey}${cleanVideoId}${expires}`)
        .digest('hex');
    }

    const safeCdn = cdnHostname || 'vz-7dc30faa-b42.b-cdn.net';
    const tokenQuery = token ? `&token=${token}&expires=${expires}` : '';
    const legacyEmbedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&disablePictureInPicture=true&disablePip=true${tokenQuery}`;
    const modernEmbedUrl = `https://player.mediadelivery.net/embed/${libraryId}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&disablePictureInPicture=true&disablePip=true${tokenQuery}`;

    return NextResponse.json({
      success: true,
      videoId: cleanVideoId,
      libraryId,
      embedUrl: legacyEmbedUrl,
      modernEmbedUrl,
      token,
      expires,
      directPlaybackUrl: `https://${safeCdn}/${cleanVideoId}/playlist.m3u8`,
    });
  } catch (error: any) {
    console.error('Error generating Bunny player token:', error);
    return NextResponse.json(
      { error: 'Failed to generate player token.' },
      { status: 500 }
    );
  }
}
