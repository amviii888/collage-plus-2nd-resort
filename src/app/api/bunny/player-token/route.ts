import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Active Bunny Stream Credentials (Library 804078)
const isOldOrStale = (val?: string) => !val || val === '775464' || val.startsWith('70922179') || val.includes('vz-c109ef36');

const LIBRARY_ID = isOldOrStale(process.env.BUNNY_STREAM_LIBRARY_ID) ? '804078' : process.env.BUNNY_STREAM_LIBRARY_ID!;
const TOKEN_KEY = isOldOrStale(process.env.BUNNY_STREAM_TOKEN_KEY) ? '14dc9ec7-b4cf-404b-b39a-afd33f122a55' : process.env.BUNNY_STREAM_TOKEN_KEY!;
const CDN_HOSTNAME = isOldOrStale(process.env.BUNNY_STREAM_CDN_HOSTNAME) ? 'vz-7dc30faa-b42.b-cdn.net' : process.env.BUNNY_STREAM_CDN_HOSTNAME!;

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
    const legacyEmbedUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&disablePictureInPicture=true&disablePip=true${tokenQuery}`;
    const modernEmbedUrl = `https://player.mediadelivery.net/embed/${LIBRARY_ID}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&disablePictureInPicture=true&disablePip=true${tokenQuery}`;

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
