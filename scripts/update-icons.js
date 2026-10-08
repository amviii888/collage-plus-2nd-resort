const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceImage = path.join(__dirname, '../src/assets/images/app_logo_mol5saty_1791372468744.jpg');

async function processIcons() {
  console.log('Generating icons from:', sourceImage);
  if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found:', sourceImage);
    process.exit(1);
  }

  const targets = [
    { dest: path.join(__dirname, '../public/icon.png'), width: 512, height: 512 },
    { dest: path.join(__dirname, '../public/app-logo.png'), width: 512, height: 512 },
    { dest: path.join(__dirname, '../public/icon2.png'), width: 512, height: 512 },
    { dest: path.join(__dirname, '../public/apple-touch-icon.png'), width: 180, height: 180 },
    { dest: path.join(__dirname, '../public/pwa-192x192.png'), width: 192, height: 192 },
    { dest: path.join(__dirname, '../public/pwa-512x512.png'), width: 512, height: 512 },
    { dest: path.join(__dirname, '../public/pwa-maskable-192x192.png'), width: 192, height: 192 },
    { dest: path.join(__dirname, '../public/pwa-maskable-512x512.png'), width: 512, height: 512 },
    { dest: path.join(__dirname, '../public/favicon-32x32.png'), width: 32, height: 32 },
    { dest: path.join(__dirname, '../public/favicon-16x16.png'), width: 16, height: 16 },
    { dest: path.join(__dirname, '../public/favicon.ico'), width: 32, height: 32 },
    { dest: path.join(__dirname, '../src/app/icon.png'), width: 512, height: 512 },
    { dest: path.join(__dirname, '../src/app/favicon.ico'), width: 32, height: 32 }
  ];

  for (const target of targets) {
    const dir = path.dirname(target.dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sharp(sourceImage)
      .resize(target.width, target.height, { fit: 'cover' })
      .png()
      .toFile(target.dest);
    console.log(`Generated: ${target.dest} (${target.width}x${target.height})`);
  }

  console.log('All icons generated successfully!');
}

processIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
