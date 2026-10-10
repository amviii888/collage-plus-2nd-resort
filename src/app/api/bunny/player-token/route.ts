import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID || '775464';
const TOKEN_KEY = process.env.BUNNY_STREAM_TOKEN_KEY || '70922179-a4eb-42eb-bddb-edb8a492e053';
const CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || 'vz-c109ef36-52a.b-cdn.net';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const cleanVideoId = videoId.replace(/^bunny:/i, '').trim();

    // Generate SHA256 Embed View Token if token key is configured (valid for 6 hours)
    const expires = Math.floor(Date.now() / 1000) + 21600;
    let token = '';

    if (TOKEN_KEY) {
      token = crypto
        .createHash('sha256')
        .update(`${TOKEN_KEY}${cleanVideoId}${expires}`)
        .digest('hex');
    }

    const tokenQuery = token ? `&token=${token}&expires=${expires}` : '';
    const legacyEmbedUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true${tokenQuery}`;
    const modernEmbedUrl = `https://player.mediadelivery.net/embed/${LIBRARY_ID}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true${tokenQuery}`;

    return NextResponse.json({
      success: true,
      videoId: cleanVideoId,
      libraryId: LIBRARY_ID,
      embedUrl: legacyEmbedUrl,
      modernEmbedUrl,
      token,
      expires,
      directPlaybackUrl: `https://${CDN_HOSTNAME}/${cleanVideoId}/playlist.m3u8`,
    });
  } catch (error: any) {
    console.error('Error generating Bunny player token:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate player token' },
      { status: 500 }
    );
  }
}
