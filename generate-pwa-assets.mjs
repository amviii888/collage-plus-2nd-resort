import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Generate high quality SVG matching the uploaded logo:
// Lime green rounded squircle, white stylized flared 'U' with long shadow at 45 degrees
const createSvg = (size = 512, isMaskable = false) => {
  const padding = isMaskable ? 0.15 : 0.04;
  const contentSize = size * (1 - padding * 2);
  const offset = size * padding;
  const radius = isMaskable ? 0 : size * 0.22; // maskable has full background, standard has rounded squircle

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Vibrant lime-to-apple-green background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84DC06"/>
      <stop offset="45%" stop-color="#76CB02"/>
      <stop offset="100%" stop-color="#5CA200"/>
    </linearGradient>

    <!-- Subtle inner highlight overlay -->
    <radialGradient id="highlight" cx="30%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- 45-degree Long Shadow Gradient -->
    <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.32"/>
      <stop offset="65%" stop-color="#000000" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Clip path to keep shadow within the icon boundary -->
    <clipPath id="iconClip">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>
    </clipPath>
  </defs>

  <!-- Background Base -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#bgGrad)"/>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#highlight)"/>

  <g clip-path="url(#iconClip)">
    <!-- Scaled group for the Logo Glyph & Shadow -->
    <g transform="translate(${offset}, ${offset}) scale(${contentSize / 512})">

      <!-- Long Shadow Polygon at 45 degrees extending to bottom-right -->
      <!-- Path starts at U-edges and extrudes down-right (dx=+280, dy=+280) -->
      <path d="
        M 124 116 
        L 396 388 
        L 480 472 
        L 410 540 
        L 220 540 
        L 256 390 
        L 388 116 
        L 490 218 
        L 490 540 
        L 124 116 Z
        M 256 390
        L 390 524
        L 290 540
        L 200 450 Z
      " fill="url(#shadowGrad)" />

      <!-- Secondary shadow blend along the stem -->
      <path d="
        M 388 116
        L 520 248
        L 520 520
        L 390 520
        L 340 370
        L 364 260
        L 388 116 Z
      " fill="url(#shadowGrad)" opacity="0.65" />

      <!-- The Stylized White U Glyph -->
      <!-- Smooth, flared horns at top, swooping curves, and organic basin -->
      <path d="
        M 124 116
        C 124 116 128 152 144 186
        C 162 224 184 250 184 274
        C 184 316 216 350 256 350
        C 296 350 328 316 328 274
        C 328 250 350 224 368 186
        C 384 152 388 116 388 116
        C 392 120 404 156 388 206
        C 370 262 344 316 312 352
        C 280 388 220 400 180 376
        C 146 356 120 316 124 254
        C 126 214 136 172 124 116 Z
      " fill="#000000" opacity="0.08" transform="translate(4, 6)"/>

      <!-- Main Pristine White 'U' -->
      <path d="
        M 124 116
        C 122 136 126 166 142 202
        C 160 242 188 266 188 288
        C 188 322 218 348 256 348
        C 294 348 324 322 324 288
        C 324 266 352 242 370 202
        C 386 166 390 136 388 116
        C 386 130 382 148 372 168
        C 356 200 338 228 338 256
        C 338 300 298 330 256 330
        C 214 330 174 300 174 256
        C 174 228 156 200 140 168
        C 130 148 126 130 124 116 Z
      " fill="#FFFFFF" />

      <!-- Full Solid White Body of the U matching the user's reference image -->
      <path d="
        M 124 116
        C 124 116 125 156 142 196
        C 158 234 186 260 186 288
        C 186 326 217 358 256 358
        C 295 358 326 326 326 288
        C 326 260 354 234 370 196
        C 387 156 388 116 388 116
        C 384 140 376 172 360 214
        C 342 262 316 312 284 346
        C 252 380 204 388 170 366
        C 142 348 126 314 126 264
        C 126 220 136 174 124 116 Z
      " fill="#FFFFFF" />

      <!-- Inner Crisp White Curved Ribbon -->
      <path d="
        M 124 116
        C 128 124 136 150 138 180
        C 142 220 130 270 156 320
        C 180 364 224 394 274 384
        C 324 374 362 334 378 284
        C 392 240 380 180 388 116
        C 374 174 356 230 326 270
        C 300 306 270 324 236 322
        C 202 320 178 300 164 266
        C 150 230 152 180 144 140
        L 124 116 Z
      " fill="#FFFFFF" opacity="0.95" />

    </g>
  </g>
</svg>`;
};

// Screenshots generator for desktop and mobile preview
const createScreenshotSvg = (width, height, isMobile = false) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="screenBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="50%" stop-color="#131316"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1f1f23"/>
      <stop offset="100%" stop-color="#131316"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#84DC06"/>
      <stop offset="100%" stop-color="#22C55E"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#screenBg)"/>

  <!-- Top Navigation Bar -->
  <rect x="0" y="0" width="${width}" height="64" fill="#131316" stroke="#27272a" stroke-width="1"/>
  <circle cx="40" cy="32" r="16" fill="#84DC06"/>
  <text x="70" y="38" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">Universe Academy</text>
  <rect x="${width - 140}" y="18" width="100" height="30" rx="8" fill="url(#accentGrad)"/>
  <text x="${width - 90}" y="38" fill="#000000" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Dashboard</text>

  <!-- Main Hero Card -->
  <rect x="${isMobile ? 20 : 60}" y="90" width="${isMobile ? width - 40 : width - 120}" height="${isMobile ? 220 : 200}" rx="16" fill="url(#cardGrad)" stroke="#27272a" stroke-width="1"/>
  <text x="${isMobile ? 40 : 90}" y="${isMobile ? 140 : 150}" fill="#84DC06" font-family="system-ui, sans-serif" font-size="${isMobile ? 22 : 28}" font-weight="bold">Offline-First Academy Management</text>
  <text x="${isMobile ? 40 : 90}" y="${isMobile ? 180 : 190}" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="${isMobile ? 14 : 16}">Real-time academic records, student QR attendance, exams &amp; automated ledger.</text>

  <!-- 3 Summary Bento Cards -->
  <g transform="translate(0, ${isMobile ? 330 : 310})">
    ${isMobile ? `
      <rect x="20" y="0" width="${width - 40}" height="140" rx="14" fill="#131316" stroke="#27272a"/>
      <text x="40" y="40" fill="#F8FAFC" font-size="16" font-weight="bold">Active Students</text>
      <text x="40" y="85" fill="#84DC06" font-size="32" font-weight="bold">1,248</text>
      <text x="40" y="115" fill="#94A3B8" font-size="12">100% Synced to Device</text>

      <rect x="20" y="160" width="${width - 40}" height="140" rx="14" fill="#131316" stroke="#27272a"/>
      <text x="40" y="200" fill="#F8FAFC" font-size="16" font-weight="bold">Today Attendance</text>
      <text x="40" y="245" fill="#22C55E" font-size="32" font-weight="bold">98.4%</text>
      <text x="40" y="275" fill="#94A3B8" font-size="12">QR Scanner Online</text>

      <rect x="20" y="320" width="${width - 40}" height="140" rx="14" fill="#131316" stroke="#27272a"/>
      <text x="40" y="360" fill="#F8FAFC" font-size="16" font-weight="bold">Active Courses</text>
      <text x="40" y="405" fill="#F59E0B" font-size="32" font-weight="bold">24</text>
      <text x="40" y="435" fill="#94A3B8" font-size="12">Interactive Modules</text>
    ` : `
      <rect x="60" y="0" width="${(width - 180) / 3}" height="180" rx="14" fill="#131316" stroke="#27272a"/>
      <text x="90" y="50" fill="#F8FAFC" font-size="18" font-weight="bold">Active Students</text>
      <text x="90" y="110" fill="#84DC06" font-size="42" font-weight="bold">1,248</text>
      <text x="90" y="150" fill="#94A3B8" font-size="14">100% Synced to Local Storage</text>

      <rect x="${60 + (width - 180)/3 + 30}" y="0" width="${(width - 180) / 3}" height="180" rx="14" fill="#131316" stroke="#27272a"/>
      <text x="${90 + (width - 180)/3 + 30}" y="50" fill="#F8FAFC" font-size="18" font-weight="bold">Today Attendance</text>
      <text x="${90 + (width - 180)/3 + 30}" y="110" fill="#22C55E" font-size="42" font-weight="bold">98.4%</text>
      <text x="${90 + (width - 180)/3 + 30}" y="150" fill="#94A3B8" font-size="14">QR Scanner Instant Check-in</text>

      <rect x="${60 + ((width - 180)/3 + 30)*2}" y="0" width="${(width - 180) / 3}" height="180" rx="14" fill="#131316" stroke="#27272a"/>
      <text x="${90 + ((width - 180)/3 + 30)*2}" y="50" fill="#F8FAFC" font-size="18" font-weight="bold">Active Courses</text>
      <text x="${90 + ((width - 180)/3 + 30)*2}" y="110" fill="#F59E0B" font-size="42" font-weight="bold">24</text>
      <text x="${90 + ((width - 180)/3 + 30)*2}" y="150" fill="#94A3B8" font-size="14">Interactive Modules &amp; Quizzes</text>
    `}
  </g>
</svg>`;
};

async function buildAll() {
  const publicDir = path.join(process.cwd(), 'public');
  const screenshotsDir = path.join(publicDir, 'screenshots');
  const widgetsDir = path.join(publicDir, 'widgets');

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(widgetsDir)) fs.mkdirSync(widgetsDir, { recursive: true });

  const svgStandard = createSvg(512, false);
  const svgMaskable = createSvg(512, true);

  // Write SVG files
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgStandard);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), svgMaskable);

  // Generate PNG icons
  const iconDefs = [
    { name: 'icon.png', size: 512, maskable: false },
    { name: 'icon2.png', size: 512, maskable: false },
    { name: 'app-logo.png', size: 512, maskable: false },
    { name: 'pwa-512x512.png', size: 512, maskable: false },
    { name: 'pwa-192x192.png', size: 192, maskable: false },
    { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { name: 'pwa-maskable-192x192.png', size: 192, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'favicon-32x32.png', size: 32, maskable: false },
    { name: 'favicon-16x16.png', size: 16, maskable: false },
  ];

  for (const def of iconDefs) {
    const svg = def.maskable ? svgMaskable : svgStandard;
    await sharp(Buffer.from(svg))
      .resize(def.size, def.size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(publicDir, def.name));
    console.log(`Generated ${def.name} (${def.size}x${def.size})`);
  }

  // Generate Screenshots
  const desktopSvg = createScreenshotSvg(1280, 720, false);
  await sharp(Buffer.from(desktopSvg))
    .resize(1280, 720)
    .png({ compressionLevel: 8 })
    .toFile(path.join(screenshotsDir, 'desktop-1.png'));
  console.log('Generated screenshots/desktop-1.png (1280x720)');

  const mobileSvg = createScreenshotSvg(750, 1334, true);
  await sharp(Buffer.from(mobileSvg))
    .resize(750, 1334)
    .png({ compressionLevel: 8 })
    .toFile(path.join(screenshotsDir, 'mobile-1.png'));
  console.log('Generated screenshots/mobile-1.png (750x1334)');

  // Generate MS Adaptive Card for Widget
  const widgetCard = {
    "type": "AdaptiveCard",
    "version": "1.4",
    "body": [
      {
        "type": "Container",
        "items": [
          {
            "type": "TextBlock",
            "text": "Universe Academy",
            "weight": "Bolder",
            "size": "Medium",
            "color": "Good"
          },
          {
            "type": "TextBlock",
            "text": "Today's Schedule & Attendance",
            "isSubtle": true,
            "spacing": "None"
          }
        ]
      },
      {
        "type": "ColumnSet",
        "columns": [
          {
            "type": "Column",
            "width": "stretch",
            "items": [
              {
                "type": "TextBlock",
                "text": "98.4%",
                "size": "ExtraLarge",
                "weight": "Bolder",
                "color": "Good"
              },
              {
                "type": "TextBlock",
                "text": "Attendance",
                "isSubtle": true,
                "spacing": "None"
              }
            ]
          },
          {
            "type": "Column",
            "width": "stretch",
            "items": [
              {
                "type": "TextBlock",
                "text": "1,248",
                "size": "ExtraLarge",
                "weight": "Bolder"
              },
              {
                "type": "TextBlock",
                "text": "Students",
                "isSubtle": true,
                "spacing": "None"
              }
            ]
          }
        ]
      }
    ],
    "actions": [
      {
        "type": "Action.OpenUrl",
        "title": "Open Dashboard",
        "url": "https://ais-pre-asvbtoo7iu7nvgvs2zbwby-739993943153.europe-west2.run.app/teacher"
      }
    ]
  };

  fs.writeFileSync(path.join(widgetsDir, 'schedule.json'), JSON.stringify(widgetCard, null, 2));
  console.log('Generated widgets/schedule.json');
}

buildAll().catch(console.error);
