/** Captures PNG réutilisées dans le rapport (PRD §7.2). */

export function telechargerBlob(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function blobEnDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Rasterise un SVG en PNG. Les <image> pointant sur des URL d'objet sont converties en data URL
 * pour que le rendu hors document fonctionne.
 */
export async function svgEnPng(svg: SVGSVGElement, largeur: number, hauteur: number, echelleRendu = 2): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(largeur));
  clone.setAttribute('height', String(hauteur));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.querySelectorAll('[data-capture="non"]').forEach((el) => el.remove());

  for (const img of Array.from(clone.querySelectorAll('image'))) {
    const href = img.getAttribute('href') ?? img.getAttribute('xlink:href');
    if (href && href.startsWith('blob:')) {
      const rep = await fetch(href);
      img.setAttribute('href', await blobEnDataUrl(await rep.blob()));
    }
  }

  // Styles utiles au rendu hors document.
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    text { font-family: 'Open Sans', system-ui, sans-serif; }
    .local-forme { fill: rgba(7,7,45,0.06); stroke: #07072D; stroke-width: 1.5px; vector-effect: non-scaling-stroke; }
    .local-forme.selectionne { fill: rgba(255,196,11,0.25); }
    .etiquette { fill: #07072D; text-anchor: middle; dominant-baseline: middle; }
    .grille { stroke: rgba(7,7,45,0.08); stroke-width: 1px; vector-effect: non-scaling-stroke; }
    .grille.majeure { stroke: rgba(7,7,45,0.16); }
    .liaison { stroke: #2980B9; stroke-width: 1.5px; stroke-dasharray: 4 3; fill: none; vector-effect: non-scaling-stroke; }
    .equip-picto { font-weight: 700; fill: #fff; text-anchor: middle; dominant-baseline: central; }
    .equip-nom { fill: #07072D; text-anchor: middle; paint-order: stroke; stroke: #fff; stroke-linejoin: round; }
    .equip-selection { fill: none; stroke: #FFC40B; stroke-width: 3px; vector-effect: non-scaling-stroke; }
    .sommet { fill: #fff; stroke: #07072D; stroke-width: 2px; }
  `;
  clone.insertBefore(style, clone.firstChild);
  const fond = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fond.setAttribute('width', '100%');
  fond.setAttribute('height', '100%');
  fond.setAttribute('fill', '#ffffff');
  clone.insertBefore(fond, style.nextSibling);

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Rendu SVG impossible.'));
      im.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(largeur * echelleRendu);
    canvas.height = Math.round(hauteur * echelleRendu);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasEnPng(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasEnPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Export PNG impossible.'))), 'image/png'));
}
