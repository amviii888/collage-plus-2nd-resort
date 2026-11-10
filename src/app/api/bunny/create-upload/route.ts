import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Active Bunny Stream Credentials (Library 804078)
const isOldOrStale = (val?: string) => !val || val === '775464' || val.startsWith('f51c7eeb') || val.includes('vz-c109ef36');

const LIBRARY_ID = isOldOrStale(process.env.BUNNY_STREAM_LIBRARY_ID) ? '804078' : process.env.BUNNY_STREAM_LIBRARY_ID!;
const API_KEY = isOldOrStale(process.env.BUNNY_STREAM_API_KEY) ? 'c30837fc-ac31-4c78-bd13ea7e8d85-177d-4dbd' : process.env.BUNNY_STREAM_API_KEY!;
const CDN_HOSTNAME = isOldOrStale(process.env.BUNNY_STREAM_CDN_HOSTNAME) ? 'vz-7dc30faa-b42.b-cdn.net' : process.env.BUNNY_STREAM_CDN_HOSTNAME!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const videoTitle = rawTitle || `Lesson - ${new Date().toLocaleDateString('ar-EG')}`;

    // 1. Create the video entry in Bunny Stream
    const createRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        title: videoTitle,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Failed to create Bunny video:', createRes.status, errText);
      return NextResponse.json(
        { error: `Bunny API Error: ${createRes.status} ${errText}` },
        { status: createRes.status }
      );
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    // 2. Generate TUS resumable upload signature (valid for 24 hours)
    const expireTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const signature = crypto
      .createHash('sha256')
      .update(`${LIBRARY_ID}${API_KEY}${expireTime}${videoId}`)
      .digest('hex');

    const embedUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
    const thumbnailUrl = `https://${CDN_HOSTNAME}/${videoId}/thumbnail.jpg`;
    const directPlaybackUrl = `https://${CDN_HOSTNAME}/${videoId}/playlist.m3u8`;

    return NextResponse.json({
      success: true,
      videoId,
      libraryId: LIBRARY_ID,
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
      { error: error?.message || 'Internal server error creating video upload' },
      { status: 500 }
    );
  }
}
