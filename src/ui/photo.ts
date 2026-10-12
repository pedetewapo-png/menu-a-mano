// Prepara la foto de una receta propia en el propio dispositivo: la recorta a 4:3
// y la reduce, para que ocupe poco y no haya que subir el original a ningún sitio.

const FULL = { width: 960, height: 720 };
const THUMB = { width: 320, height: 240 };
/** Tope de la foto grande (especificación v2, F11). */
export const MAX_PHOTO_BYTES = 200 * 1024;
const MAX_THUMB_BYTES = 30 * 1024;
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32];

export interface ProcessedPhoto {
  full: string;
  thumb: string;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar la imagen'))), type, quality);
  });
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function render(bitmap: ImageBitmap, size: { width: number; height: number }, maxBytes: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  // Recorte centrado que llena todo el recuadro.
  const scale = Math.max(size.width / bitmap.width, size.height / bitmap.height);
  const sourceWidth = size.width / scale;
  const sourceHeight = size.height / scale;
  canvas
    .getContext('2d')!
    .drawImage(
      bitmap,
      (bitmap.width - sourceWidth) / 2,
      (bitmap.height - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      size.width,
      size.height,
    );

  // WebP donde el navegador sepa escribirlo; si no, JPEG.
  const probe = await toBlob(canvas, 'image/webp', QUALITIES[0]!);
  const type = probe.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  let blob = type === 'image/webp' ? probe : await toBlob(canvas, type, QUALITIES[0]!);
  // Se baja la calidad hasta que quepa en el tope.
  for (const quality of QUALITIES.slice(1)) {
    if (blob.size <= maxBytes) break;
    blob = await toBlob(canvas, type, quality);
  }
  return toDataUrl(blob);
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  // Respeta la orientación con la que el móvil hizo la foto.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    return { full: await render(bitmap, FULL, MAX_PHOTO_BYTES), thumb: await render(bitmap, THUMB, MAX_THUMB_BYTES) };
  } finally {
    bitmap.close();
  }
}
