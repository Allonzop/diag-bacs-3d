import { expect, test } from '@playwright/test';

test('téléphone : en-tête tenant sur l’écran, panneau tiroir, placement tactile depuis le bac', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Charger le projet démo' }).tap();
  await page.waitForSelector('svg.editeur2d');
  // Tous les boutons de l'en-tête restent dans la largeur de l'écran.
  const largeur = page.viewportSize()!.width;
  for (const b of await page.locator('header button:visible').all()) {
    const bb = (await b.boundingBox())!;
    expect(bb.x + bb.width).toBeLessThanOrEqual(largeur + 1);
  }
  await page.locator('.barre-outils button:has-text("Panneau")').tap();
  await expect(page.locator('.panneau.ouvert')).toBeVisible();
  await page.locator('.panneau li', { hasText: "Compteur d'eau" }).getByRole('button', { name: 'Placer' }).tap();
  const svg = (await page.locator('svg.editeur2d').boundingBox())!;
  await page.touchscreen.tap(svg.x + 200, svg.y + 500);
  await expect(page.locator('svg.editeur2d circle.equip-cible[data-id="e_compteur_eau"]')).toHaveCount(1);
  await page.locator('header nav button[title="3D"]').tap();
  await expect(page.locator('.vue3d canvas')).toBeVisible();
});
