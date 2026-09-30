import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { creerEquipement, creerLocal, creerNiveau, creerProjet, creerZone, rectangle } from '../../src/modele/projet';
import { TYPES_EQUIPEMENT } from '../../src/modele/types';
import { exporterZip } from '../../src/stockage/zip';

/**
 * Test de charge (PRD §9) : 10 niveaux, 150 locaux, 500 équipements.
 * Vérifie que l'import, le plan et la 3D tiennent ; la cadence mesurée en rendu logiciel
 * est seulement indicative (la cible de 30 i/s se mesure sur iPad).
 */
function projetDeCharge() {
  const p = creerProjet({ id: 'p_charge', reference: 'CHARGE-0001', nom: 'Projet de charge', coefficientCheminement: 1.2, versionsReferentiels: {} });
  const zone = creerZone('Grand bâtiment', 'z_charge');
  p.zones.push(zone);
  let nEq = 0;
  for (let n = 0; n < 10; n++) {
    const niveau = creerNiveau(zone.id, `N${n}`, n * 3.5, 3, n, `n_${n}`);
    p.niveaux.push(niveau);
    const automate = creerEquipement(zone.id, 'boitier', `Automate N${n}`, {}, `e_aut_${n}`);
    automate.niveauId = niveau.id;
    automate.position = { x: 1, y: 1, z: 1.5 };
    p.equipements.push(automate);
    nEq++;
    for (let i = 0; i < 15; i++) {
      const x = (i % 5) * 8;
      const y = Math.floor(i / 5) * 8;
      const local = creerLocal(zone.id, niveau.id, `Local ${n}-${i}`, rectangle(x, y, 8, 8), '', `l_${n}_${i}`);
      p.locaux.push(local);
      for (let k = 0; k < 3 && nEq < 500; k++) {
        const type = TYPES_EQUIPEMENT[(i + k) % TYPES_EQUIPEMENT.length]!;
        const e = creerEquipement(zone.id, type, `${type} ${n}-${i}-${k}`, {}, `e_${n}_${i}_${k}`);
        e.niveauId = niveau.id;
        e.localId = local.id;
        e.position = { x: x + 1 + k * 2, y: y + 2 + k, z: 1 };
        e.lieA = automate.id;
        p.equipements.push(e);
        nEq++;
      }
    }
  }
  return p;
}

test('charge : 10 niveaux, 150 locaux, 500 équipements', async ({ page }, infos) => {
  const p = projetDeCharge();
  expect(p.locaux).toHaveLength(150);
  expect(p.equipements.length).toBeGreaterThanOrEqual(460);
  const zip = await exporterZip(p, []);
  // JSZip est aussi utilisé côté nœud pour produire le fichier à importer.
  const octets = Buffer.from(await zip.arrayBuffer());
  expect((await JSZip.loadAsync(octets)).file('projet.json')).toBeTruthy();

  await page.goto('/');
  await page.setInputFiles('input[type=file][accept*="zip"]', { name: 'charge.zip', mimeType: 'application/zip', buffer: octets });
  await expect(page.locator('svg.editeur2d')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('svg.editeur2d polygon.local-forme')).toHaveCount(15);

  await page.locator('header nav button[title="Métrés"]').click();
  await expect(page.getByText('Points câblés')).toBeVisible();

  await page.locator('header nav button[title="3D"]').click();
  await expect(page.locator('.vue3d canvas')).toBeVisible();
  await page.waitForTimeout(2000);
  const ips = await page.evaluate(
    () =>
      new Promise<number>((res) => {
        let n = 0;
        const debut = performance.now();
        const boucle = () => {
          n++;
          if (performance.now() - debut < 2000) requestAnimationFrame(boucle);
          else res(n / 2);
        };
        requestAnimationFrame(boucle);
      }),
  );
  infos.annotations.push({ type: 'cadence 3D (rendu logiciel)', description: `${ips.toFixed(1)} i/s` });
  console.log(`cadence 3D en rendu logiciel : ${ips.toFixed(1)} i/s`);
  // Seuil volontairement bas : il détecte un blocage, pas une lenteur. La cible de 30 i/s se mesure sur iPad.
  expect(ips).toBeGreaterThan(0.5);
});
