/** Préparation d'un fond de plan : image (PNG/JPG) ou première page d'un PDF, via pdf.js embarqué. */

const COTE_MAX = 3000;

export interface FondPrepare {
  blob: Blob;
  largeurPx: number;
  hauteurPx: number;
}

export async function preparerFondDePlan(fichier: File): Promise<FondPrepare> {
  if (fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name)) return pdfEnImage(fichier);
  return imageNormalisee(fichier);
}

async function imageNormalisee(fichier: Blob): Promise<FondPrepare> {
  const bitmap = await createImageBitmap(fichier);
  const facteur = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
  if (facteur === 1) {
    const r = { blob: fichier, largeurPx: bitmap.width, hauteurPx: bitmap.height };
    bitmap.close();
    return r;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * facteur);
  canvas.height = Math.round(bitmap.height * facteur);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Conversion impossible.'))), 'image/png'));
  return { blob, largeurPx: canvas.width, hauteurPx: canvas.height };
}

async function pdfEnImage(fichier: File): Promise<FondPrepare> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: await fichier.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const echelle = Math.min(4, COTE_MAX / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale: echelle });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  await doc.destroy();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Conversion impossible.'))), 'image/png'));
  return { blob, largeurPx: canvas.width, hauteurPx: canvas.height };
}

/** Photo : réduite à 1600 px de côté, JPEG. */
export async function preparerPhoto(fichier: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(fichier);
  const facteur = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * facteur);
  canvas.height = Math.round(bitmap.height * facteur);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Conversion impossible.'))), 'image/jpeg', 0.85));
}
