import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function replaceAll() {
  const source = path.join(process.cwd(), 'public', 'icon.png');
  const pub = path.join(process.cwd(), 'public');

  if (!fs.existsSync(source)) {
    console.error('Source icon.png not found');
    process.exit(1);
  }

  console.log('Source icon.png size:', fs.statSync(source).size);

  // Exact copies
  fs.copyFileSync(source, path.join(pub, 'icon2.png'));
  fs.copyFileSync(source, path.join(pub, 'app-logo.png'));
  console.log('Copied icon2.png and app-logo.png');

  // Exact resizes
  await sharp(source).resize(512, 512).png().toFile(path.join(pub, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  await sharp(source).resize(192, 192).png().toFile(path.join(pub, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  await sharp(source).resize(512, 512).png().toFile(path.join(pub, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  await sharp(source).resize(192, 192).png().toFile(path.join(pub, 'pwa-maskable-192x192.png'));
  console.log('Created pwa-maskable-192x192.png');

  await sharp(source).resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  await sharp(source).resize(32, 32).png().toFile(path.join(pub, 'favicon-32x32.png'));
  console.log('Created favicon-32x32.png');

  await sharp(source).resize(16, 16).png().toFile(path.join(pub, 'favicon-16x16.png'));
  console.log('Created favicon-16x16.png');

  fs.copyFileSync(path.join(pub, 'favicon-32x32.png'), path.join(pub, 'favicon.ico'));
  console.log('Created favicon.ico');

  console.log('ALL ICONS DIRECTLY REPLACED FROM YOUR RAW ICON.PNG!');
}

replaceAll().catch(err => {
  console.error(err);
  process.exit(1);
});
