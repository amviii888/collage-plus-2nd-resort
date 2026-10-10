/**
 * Bunny.net Stream & CDN Video Integration Helper
 * 
 * Supports Bunny Stream Video Libraries, Iframe Embeds, Direct HLS playlists (.m3u8),
 * Token Authentication security signatures, and YouTube / Direct MP4 fallbacks.
 */

export interface BunnyConfig {
  libraryId: string;
  cdnHostname: string;
  apiKey?: string;
  tokenSecurityKey?: string;
}

// Active Bunny configuration with fallbacks
export const BUNNY_CONFIG: BunnyConfig = {
  libraryId: process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID || '775464',
  cdnHostname: process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || process.env.BUNNY_STREAM_CDN_HOSTNAME || 'vz-c109ef36-52a.b-cdn.net',
  apiKey: process.env.BUNNY_STREAM_API_KEY || 'f51c7eeb-a556-4f0c-b89eb28b965c-38f1-4b98',
  tokenSecurityKey: process.env.BUNNY_STREAM_TOKEN_KEY || '70922179-a4eb-42eb-bddb-edb8a492e053',
};

export type VideoProviderType = 'bunny' | 'youtube' | 'drive' | 'direct';

export interface ParsedVideoSource {
  provider: VideoProviderType;
  videoId?: string;
  libraryId?: string;
  embedUrl: string;
  rawUrl: string;
  isSecured: boolean;
}

/**
 * Checks if a string or URL is a Bunny Stream video ID or full Bunny URL
 */
export function isBunnyStreamUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('mediadelivery.net') ||
    lower.includes('b-cdn.net') ||
    lower.includes('bunnycdn.com') ||
    lower.startsWith('bunny:') ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url.trim()) // UUID video id
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses any video URL (Bunny, YouTube, Google Drive, direct MP4/HLS) and creates a hardened embed URL
 */
export function parseVideoSource(rawUrl: string, customLibraryId?: string): ParsedVideoSource | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  const defaultLibId = customLibraryId || BUNNY_CONFIG.libraryId || '775464';

  // 1. Check for Bunny Video UUID or "bunny:VIDEO_ID"
  const isBunnyUuid = UUID_REGEX.test(trimmed);
  const isBunnyPrefix = trimmed.startsWith('bunny:');

  if (isBunnyUuid || isBunnyPrefix) {
    const videoId = isBunnyPrefix ? trimmed.replace('bunny:', '').trim() : trimmed;
    const libId = defaultLibId;
    const embedUrl = `https://iframe.mediadelivery.net/embed/${libId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
    return {
      provider: 'bunny',
      videoId,
      libraryId: libId,
      embedUrl,
      rawUrl: trimmed,
      isSecured: true,
    };
  }

  // 2. Check for full Bunny iframe or CDN play/embed URL
  if (isBunnyStreamUrl(trimmed)) {
    try {
      const urlObj = new URL(trimmed);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      let libraryId = defaultLibId;
      let videoId = '';

      if (urlObj.hostname.includes('mediadelivery.net')) {
        // Format: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
        // Format: https://iframe.mediadelivery.net/play/{libraryId}/{videoId}
        if (pathParts.length >= 3 && (pathParts[0] === 'embed' || pathParts[0] === 'play')) {
          libraryId = pathParts[1];
          videoId = pathParts[2];
        } else if (pathParts.length >= 2) {
          // If first part is numeric, it is libraryId; if UUID, it is videoId
          if (/^\d+$/.test(pathParts[0])) {
            libraryId = pathParts[0];
            videoId = pathParts[1];
          } else if (UUID_REGEX.test(pathParts[0])) {
            videoId = pathParts[0];
            libraryId = defaultLibId;
          } else {
            libraryId = pathParts[0];
            videoId = pathParts[1];
          }
        }
      } else if (urlObj.hostname.includes('b-cdn.net') || urlObj.hostname.includes('bunnycdn.com')) {
        // Format: https://vz-c109ef36-52a.b-cdn.net/{videoId}/playlist.m3u8
        // Format: https://vz-c109ef36-52a.b-cdn.net/{videoId}/thumbnail.jpg
        for (const part of pathParts) {
          const cleanPart = part.replace(/\.(m3u8|jpg|png|mp4)$/i, '');
          if (UUID_REGEX.test(cleanPart)) {
            videoId = cleanPart;
            break;
          }
        }
        libraryId = defaultLibId;
      }

      // Sanitize extracted videoId in case it has trailing extensions
      if (videoId) {
        videoId = videoId.replace(/\.(m3u8|jpg|png|mp4)$/i, '');
      }

      // If libraryId was mistakenly assigned a UUID, restore default libraryId
      if (UUID_REGEX.test(libraryId)) {
        if (!videoId || videoId.includes('.')) {
          videoId = libraryId;
        }
        libraryId = defaultLibId;
      }

      const embedUrl = videoId
        ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`
        : trimmed;

      return {
        provider: 'bunny',
        videoId: videoId || undefined,
        libraryId,
        embedUrl,
        rawUrl: trimmed,
        isSecured: true,
      };
    } catch {
      return {
        provider: 'bunny',
        embedUrl: trimmed,
        rawUrl: trimmed,
        isSecured: true,
      };
    }
  }

  // 3. YouTube Embed
  try {
    const urlObj = new URL(trimmed);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.hostname === 'youtu.be'
        ? urlObj.pathname.slice(1)
        : urlObj.searchParams.get('v');
      
      if (videoId) {
        return {
          provider: 'youtube',
          videoId,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
          rawUrl: trimmed,
          isSecured: false,
        };
      }
    }

    // 4. Google Drive Embed
    if (urlObj.hostname.includes('drive.google.com')) {
      const match = trimmed.match(/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return {
          provider: 'drive',
          videoId: match[1],
          embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
          rawUrl: trimmed,
          isSecured: false,
        };
      }
    }

    // 5. Direct MP4 / HLS Link
    if (trimmed.endsWith('.mp4') || trimmed.endsWith('.m3u8') || trimmed.includes('.b-cdn.net/')) {
      return {
        provider: 'direct',
        embedUrl: trimmed,
        rawUrl: trimmed,
        isSecured: true,
      };
    }
  } catch (e) {
    console.warn('Could not parse video URL:', trimmed, e);
  }

  return null;
}
