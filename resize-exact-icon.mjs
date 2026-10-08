import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateExactIcons() {
  const sourcePath = path.join(process.cwd(), 'public', 'icon.png');
  const publicDir = path.join(process.cwd(), 'public');

  if (!fs.existsSync(sourcePath)) {
    console.error('Source icon not found:', sourcePath);
    return;
  }

  console.log('Reading exact user uploaded file:', sourcePath);

  // 1. icon2.png -> exact copy
  fs.copyFileSync(sourcePath, path.join(publicDir, 'icon2.png'));
  fs.copyFileSync(sourcePath, path.join(publicDir, 'app-logo.png'));
  console.log('Copied icon2.png and app-logo.png directly');

  // 2. pwa-512x512.png
  await sharp(sourcePath)
    .resize(512, 512, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // 3. pwa-192x192.png
  await sharp(sourcePath)
    .resize(192, 192, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 4. pwa-maskable-512x512.png (80% safe zone on matching background)
  const inner512 = await sharp(sourcePath)
    .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 132, g: 220, b: 6, alpha: 1 } // Matching user green
    }
  })
    .composite([{ input: inner512, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // 5. pwa-maskable-192x192.png
  const inner192 = await sharp(sourcePath)
    .resize(154, 154, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 132, g: 220, b: 6, alpha: 1 }
    }
  })
    .composite([{ input: inner192, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-192x192.png'));
  console.log('Generated pwa-maskable-192x192.png');

  // 6. apple-touch-icon.png (180x180)
  await sharp(sourcePath)
    .resize(180, 180, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 7. favicon-32x32.png
  await sharp(sourcePath)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('Generated favicon-32x32.png');

  // 8. favicon-16x16.png
  await sharp(sourcePath)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('Generated favicon-16x16.png');

  // 9. favicon.ico (copy 32x32)
  fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  console.log('ALL ICONS DIRECTLY RESIZED FROM YOUR EXACT UPLOADED FILE!');
}

generateExactIcons().catch(console.error);
