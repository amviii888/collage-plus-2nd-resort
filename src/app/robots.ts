import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://universeacademy.site';

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/login',
        '/signup-options',
        '/support',
        '/icon.png',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/favicon.ico',
        '/favicon-32x32.png',
        '/favicon-16x16.png',
        '/apple-touch-icon.png',
        '/manifest.json',
      ],
      disallow: ['/teacher/', '/student/', '/admin/', '/assistant/', '/api/', '/discover/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
