import { NextRequest, NextResponse } from 'next/server';

const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID || '775464';
const API_KEY = process.env.BUNNY_STREAM_API_KEY || 'f51c7eeb-a556-4f0c-b89eb28b965c-38f1-4b98';
const CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || 'vz-c109ef36-52a.b-cdn.net';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'AccessKey': API_KEY,
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Bunny API Error: ${errText}` }, { status: res.status });
    }

    const video = await res.json();

    // Bunny Video Status mapping:
    // 0 = Created, 1 = Uploaded, 2 = Processing, 3 = Transcoding, 4 = Finished (Ready), 5 = Error, 6 = UploadFailed
    const statusMap: Record<number, string> = {
      0: 'created',
      1: 'uploaded',
      2: 'processing',
      3: 'transcoding',
      4: 'ready',
      5: 'error',
      6: 'failed',
    };

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
      thumbnailUrl: `https://${CDN_HOSTNAME}/${video.guid}/thumbnail.jpg`,
      embedUrl: `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${video.guid}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`,
      directPlaybackUrl: `https://${CDN_HOSTNAME}/${video.guid}/playlist.m3u8`,
    });
  } catch (error: any) {
    console.error('Error fetching Bunny video status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}
