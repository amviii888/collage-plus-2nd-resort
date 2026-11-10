import { NextRequest, NextResponse } from 'next/server';

// Active Bunny Stream Credentials (Library 804078)
const isOldOrStale = (val?: string) => !val || val === '775464' || val.startsWith('f51c7eeb') || val.includes('vz-c109ef36');

const LIBRARY_ID = isOldOrStale(process.env.BUNNY_STREAM_LIBRARY_ID) ? '804078' : process.env.BUNNY_STREAM_LIBRARY_ID!;
const API_KEY = isOldOrStale(process.env.BUNNY_STREAM_API_KEY) ? 'c30837fc-ac31-4c78-bd13ea7e8d85-177d-4dbd' : process.env.BUNNY_STREAM_API_KEY!;
const CDN_HOSTNAME = isOldOrStale(process.env.BUNNY_STREAM_CDN_HOSTNAME) ? 'vz-7dc30faa-b42.b-cdn.net' : process.env.BUNNY_STREAM_CDN_HOSTNAME!;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    if (!req.body) {
      return NextResponse.json({ error: 'No video payload received' }, { status: 400 });
    }

    // Pipe the stream directly to Bunny Stream without buffering the entire file into memory
    const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
      method: 'PUT',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      // Pass the readable stream directly
      // @ts-ignore
      body: req.body,
      duplex: 'half',
    });

    if (!bunnyRes.ok) {
      const errText = await bunnyRes.text();
      return NextResponse.json(
        { error: `Bunny Stream Upload Failed: ${errText}` },
        { status: bunnyRes.status }
      );
    }

    const data = await bunnyRes.json().catch(() => ({ success: true }));

    return NextResponse.json({
      success: true,
      videoId,
      data,
      embedUrl: `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`,
      thumbnailUrl: `https://${CDN_HOSTNAME}/${videoId}/thumbnail.jpg`,
    });
  } catch (error: any) {
    console.error('Error proxying Bunny upload:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload video' },
      { status: 500 }
    );
  }
}
