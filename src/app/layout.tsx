import './globals.css';
import type { Metadata } from 'next';
import { Inter, Syne, Space_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const syne = Syne({ subsets: ['latin'], variable: '--font-display', weight: ['400', '600', '700', '800'] });
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: {
    default: 'Mol5saty | ملخصاتي - المنصة الجامعية وتلخيص المحاضرات',
    template: '%s | Mol5saty (ملخصاتي)',
  },
  description: 'ملخصاتي (Mol5saty) — المنصة الأكاديمية الرائدة لطلاب الكليات وأساتذة الجامعات لتلخيص المحاضرات، بنوك الأسئلة الإكلينيكية، وبث الفيديوهات الآمن.',
  keywords: [
    'Mol5saty',
    'ملخصاتي',
    'منصة ملخصاتي',
    'ملخصات جامعية',
    'طب بشري',
    'طب أسنان',
    'صيدلة إكلينيكية',
    'هندسة وحاسبات',
    'محاضرات الجامعات',
    'بنوك أسئلة جامعية',
    'University College Portal',
    'Medical Lecture Summaries',
    'High-Yield Summaries',
    'Egypt Universities',
    'Mol5saty App'
  ],
  authors: [{ name: 'amviii8 & Ahmed (Mol5saty Architecture Team)' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '48x48',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        url: '/pwa-192x192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        url: '/pwa-192x192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/icon.png',
      },
    ],
  },
  themeColor: '#09090b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mol5saty (ملخصاتي)',
  },
  metadataBase: new URL('https://universeacademy.site'),
  openGraph: {
    title: 'Mol5saty | ملخصاتي - المنصة الجامعية وتلخيص المحاضرات',
    description: 'ملخصاتي (Mol5saty) — المنصة الأكاديمية الرائدة لطلاب الكليات وأساتذة الجامعات لتلخيص المحاضرات، بنوك الأسئلة الإكلينيكية، وبث الفيديوهات الآمن.',
    url: 'https://universeacademy.site',
    siteName: 'Mol5saty | ملخصاتي',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Mol5saty Logo',
      },
    ],
    locale: 'ar_EG',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mol5saty | ملخصاتي',
    description: 'ملخصاتي (Mol5saty) — المنصة الأكاديمية الرائدة لطلاب الكليات وأساتذة الجامعات لتلخيص المحاضرات، بنوك الأسئلة الإكلينيكية، وبث الفيديوهات الآمن.',
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Mol5saty',
    alternateName: 'ملخصاتي',
    url: 'https://universeacademy.site',
    logo: 'https://universeacademy.site/icon.png',
    description: 'ملخصاتي (Mol5saty) — المنصة الأكاديمية الرائدة لطلاب الكليات وأساتذة الجامعات لتلخيص المحاضرات، بنوك الأسئلة الإكلينيكية، وبث الفيديوهات الآمن.',
    sameAs: [
      'https://instagram.com/amviii_8',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mol5saty | ملخصاتي',
    url: 'https://universeacademy.site',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://universeacademy.site/discover?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'SiteNavigationElement',
        position: 1,
        name: 'Login / تسجيل الدخول',
        description: 'Sign in to your Universe Academy student, teacher, or assistant account. تسجيل الدخول إلى حسابك في يونيفرس أكاديمي.',
        url: 'https://universeacademy.site/login'
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'Sign Up / إنشاء حساب جديد',
        description: 'Create a new account on Universe Academy. إنشاء حساب جديد للطلاب والمعلمين ومساعدي المدرسين.',
        url: 'https://universeacademy.site/signup-options'
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'Support / الدعم الفني والمساعدة',
        description: 'Universe Academy customer support and help center. مركز الدعم والمساعدة الفنية.',
        url: 'https://universeacademy.site/support'
      }
    ]
  }
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#09090b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Universe" />
        <meta name="application-name" content="Universe Academy" />
        <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico?v=4" />
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa-192x192.png?v=4" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon.png?v=4" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=4" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[Universe SW] Immediate Head SW Registration:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[Universe SW] SW Registration error:', err);
                    });
                });
              }
            `
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                function sanitize(val, seen) {
                  if (!seen) seen = new WeakSet();
                  if (val === null || val === undefined) return val;

                  // If it's a DOM element, Node, or window/document
                  if (
                    (typeof val === 'object' && ('nodeType' in val || val === window || val === document)) ||
                    (typeof Element !== 'undefined' && val instanceof Element)
                  ) {
                    return '[DOM Element ' + (val.tagName || val.nodeName || 'element').toLowerCase() + ']';
                  }

                  if (typeof val === 'function') {
                    return '[Function: ' + (val.name || 'anonymous') + ']';
                  }

                  if (typeof val === 'symbol') {
                    return val.toString();
                  }

                  if (typeof val === 'object') {
                    if (seen.has(val)) {
                      return '[Circular Reference]';
                    }
                    seen.add(val);

                    // React / Fiber internal object checks
                    if (val.$$typeof || val._reactName || val._reactRef || val.stateNode || val.return || val.child) {
                      return '[React Internal Object]';
                    }

                    // Arrays
                    if (Array.isArray(val)) {
                      return val.map(function(item) {
                        try {
                          return sanitize(item, seen);
                        } catch (e) {
                          return '[Unsafe Element]';
                        }
                      });
                    }

                    // Objects
                    const result = {};
                    for (const key in val) {
                      if (Object.prototype.hasOwnProperty.call(val, key)) {
                        if (key.startsWith('__reactFiber') || key.startsWith('__reactProps') || key.startsWith('__reactEvents')) {
                          result[key] = '[React Internal Property]';
                          continue;
                        }
                        try {
                          result[key] = sanitize(val[key], seen);
                        } catch (e) {
                          result[key] = '[Unsafe Value]';
                        }
                      }
                    }
                    return result;
                  }

                  return val;
                }

                const methods = ['log', 'warn', 'error', 'info'];
                const nativeMethods = {};
                
                methods.forEach(function(method) {
                  nativeMethods[method] = console[method];
                });

                let isSanitizing = false;

                methods.forEach(function(method) {
                  let currentTarget = console[method];
                  
                  try {
                    Object.defineProperty(console, method, {
                      get: function() {
                        return function() {
                          const args = Array.prototype.slice.call(arguments);
                          if (isSanitizing) {
                            if (nativeMethods[method]) {
                              return nativeMethods[method].apply(this, args);
                            }
                            return;
                          }
                          isSanitizing = true;
                          try {
                            const sanitized = args.map(function(arg) {
                              try {
                                return sanitize(arg);
                              } catch (e) {
                                return '[Sanitization Error]';
                              }
                            });
                            if (currentTarget) {
                              return currentTarget.apply(this, sanitized);
                            }
                          } finally {
                            isSanitizing = false;
                          }
                        };
                      },
                      set: function(newVal) {
                        currentTarget = newVal;
                      },
                      configurable: true,
                    });
                  } catch (e) {
                    const orig = console[method];
                    if (orig) {
                      console[method] = function() {
                        const args = Array.prototype.slice.call(arguments);
                        const sanitized = args.map(function(arg) {
                          try {
                            return sanitize(arg);
                          } catch (e) {
                            return '[Sanitization Error]';
                          }
                        });
                        return orig.apply(this, sanitized);
                      };
                    }
                  }
                });

                // Monkey-patch global JSON.stringify to safely handle circular references and DOM Elements
                const nativeStringify = JSON.stringify;
                JSON.stringify = function(value, replacer, space) {
                  try {
                    return nativeStringify(value, replacer, space);
                  } catch (e) {
                    try {
                      return nativeStringify(sanitize(value), replacer, space);
                    } catch (err) {
                      return '"[Serialization Error]"';
                    }
                  }
                };
              })();
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${syne.variable} ${spaceMono.variable}`} suppressHydrationWarning>
        <Providers>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
