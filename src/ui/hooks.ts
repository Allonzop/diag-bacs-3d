import { useEffect, useRef, useState } from 'react';
import { chargerFichier } from '../stockage/db';

const cacheUrls = new Map<string, { url: string; compteur: number }>();

/** URL d'objet pour un fichier d'IndexedDB, partagée et libérée quand plus personne ne l'utilise. */
export function useFichierUrl(fichierId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (fichierId && cacheUrls.get(fichierId)?.url) || null);
  useEffect(() => {
    if (!fichierId) {
      setUrl(null);
      return;
    }
    let actif = true;
    const existant = cacheUrls.get(fichierId);
    if (existant) {
      existant.compteur += 1;
      setUrl(existant.url);
    } else {
      void chargerFichier(fichierId).then((f) => {
        if (!actif || !f) return;
        const entree = cacheUrls.get(fichierId) ?? { url: URL.createObjectURL(f.blob), compteur: 0 };
        entree.compteur += 1;
        cacheUrls.set(fichierId, entree);
        setUrl(entree.url);
      });
    }
    return () => {
      actif = false;
      const e = cacheUrls.get(fichierId);
      if (e) {
        e.compteur -= 1;
        if (e.compteur <= 0) {
          URL.revokeObjectURL(e.url);
          cacheUrls.delete(fichierId);
        }
      }
    };
  }, [fichierId]);
  return url;
}

export function useTailleElement<T extends HTMLElement>(): [React.RefObject<T | null>, { largeur: number; hauteur: number }] {
  const ref = useRef<T | null>(null);
  const [taille, setTaille] = useState({ largeur: 0, hauteur: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entree]) => {
      if (entree) setTaille({ largeur: entree.contentRect.width, hauteur: entree.contentRect.height });
    });
    obs.observe(el);
    setTaille({ largeur: el.clientWidth, hauteur: el.clientHeight });
    return () => obs.disconnect();
  }, []);
  return [ref, taille];
}
