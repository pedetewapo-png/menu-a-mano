// Genera los iconos PNG del manifiesto a partir de public/icons/icon.svg. Uso: npm run icons
import { join } from 'node:path';
import sharp from 'sharp';

const dir = join(import.meta.dirname, '..', 'public', 'icons');

for (const size of [192, 512]) {
  await sharp(join(dir, 'icon.svg'), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(dir, `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}
