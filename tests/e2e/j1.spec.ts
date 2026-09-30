import { expect, test, type Page } from '@playwright/test';

async function ouvrirDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Charger le projet démo' }).click();
  await page.waitForSelector('svg.editeur2d');
}

test.describe('J1 — maquette et métrés', () => {
  test('le projet démo est dessiné et un tap ouvre la fiche', async ({ page }) => {
    await ouvrirDemo(page);
    await expect(page.locator('svg.editeur2d polygon.local-forme')).toHaveCount(5);
    await expect(page.locator('svg.editeur2d circle.equip-cible')).toHaveCount(12);
    const cible = page.locator('svg.editeur2d circle.equip-cible[data-id="e_chaudiere"]');
    const bb = (await cible.boundingBox())!;
    await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await expect(page.locator('input[value="Chaudière gaz"]')).toBeVisible();
    await expect(page.getByText(/Câble : 8\.88 m estimés/)).toBeVisible();
  });

  test('dessin d’un rectangle, annulation et rétablissement', async ({ page }) => {
    await ouvrirDemo(page);
    await page.getByRole('button', { name: 'Rectangle' }).click();
    const svg = (await page.locator('svg.editeur2d').boundingBox())!;
    await page.mouse.move(svg.x + 900, svg.y + 150);
    await page.mouse.down();
    await page.mouse.move(svg.x + 1000, svg.y + 250, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('svg.editeur2d polygon.local-forme')).toHaveCount(6);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
    await expect(page.locator('svg.editeur2d polygon.local-forme')).toHaveCount(5);
    await page.getByRole('button', { name: 'Rétablir' }).click();
    await expect(page.locator('svg.editeur2d polygon.local-forme')).toHaveCount(6);
  });

  test('pincement à deux doigts : le zoom change', async ({ page }) => {
    await ouvrirDemo(page);
    const avant = await page.locator('svg.editeur2d > text').textContent();
    await page.evaluate(() => {
      const el = document.querySelector('svg.editeur2d')!;
      const r = el.getBoundingClientRect();
      const ev = (type: string, id: number, x: number, y: number) =>
        el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: id === 1, button: 0 }));
      ev('pointerdown', 1, 500, 400);
      ev('pointerdown', 2, 600, 400);
      ev('pointermove', 1, 450, 400);
      ev('pointermove', 2, 650, 400);
      ev('pointerup', 1, 450, 400);
      ev('pointerup', 2, 650, 400);
    });
    await expect(page.locator('svg.editeur2d > text')).not.toHaveText(avant!);
  });

  test('vue 3D : rendu, orbite à la souris, tap tactile, capture PNG', async ({ page }) => {
    await ouvrirDemo(page);
    await page.locator('header nav button[title="3D"]').click();
    const canvas = page.locator('.vue3d canvas');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1500);
    const c = (await canvas.boundingBox())!;
    const avant = await canvas.screenshot();
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await page.mouse.down();
    await page.mouse.move(c.x + c.width / 2 + 200, c.y + c.height / 2 + 50, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    expect((await canvas.screenshot()).equals(avant)).toBe(false);
    await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.vue3d button:has-text("PNG")').click()]);
    expect(dl.suggestedFilename()).toBe('maquette3d_DEMO-0001.png');
  });

  test('métrés affichés et export CSV', async ({ page }) => {
    await ouvrirDemo(page);
    await page.locator('header nav button[title="Métrés"]').click();
    await expect(page.getByText(/Total : 70 points/)).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()]);
    expect(dl.suggestedFilename()).toBe('metres_DEMO-0001.csv');
  });

  test('export .zip, puis mode avion : l’app se recharge et ouvre le projet hors ligne', async ({ page, context }) => {
    await ouvrirDemo(page);
    const [zip] = await Promise.all([page.waitForEvent('download'), page.locator('header button[title="Exporter une sauvegarde .zip"]').click()]);
    expect(zip.suggestedFilename()).toMatch(/^diag-bacs_DEMO-0001_\d{4}-\d{2}-\d{2}\.zip$/);
    // Le service worker doit contrôler la page avant de couper le réseau.
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20_000 });
    await page.locator('header nav button[title="3D"]').click();
    await expect(page.locator('.vue3d canvas')).toBeVisible();
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Projets sur cet appareil')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Ouvrir' }).first().click();
    await expect(page.locator('svg.editeur2d')).toBeVisible();
    await expect(page.getByText('Hors ligne')).toBeVisible();
    await page.locator('header nav button[title="3D"]').click();
    await expect(page.locator('.vue3d canvas')).toBeVisible();
    await context.setOffline(false);
  });

  test('import d’un .zip sur un profil vierge', async ({ page, browser }) => {
    await ouvrirDemo(page);
    const [zip] = await Promise.all([page.waitForEvent('download'), page.locator('header button[title="Exporter une sauvegarde .zip"]').click()]);
    const chemin = await zip.path();
    const ctx2 = await browser.newContext({ locale: 'fr-FR' });
    const p2 = await ctx2.newPage();
    await p2.goto('/');
    await p2.setInputFiles('input[type=file][accept*="zip"]', chemin);
    await expect(p2.locator('svg.editeur2d')).toBeVisible();
    await expect(p2.locator('polygon.local-forme')).toHaveCount(5);
    await ctx2.close();
  });
});
