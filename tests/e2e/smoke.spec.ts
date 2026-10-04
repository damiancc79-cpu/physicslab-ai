import { expect, test } from '@playwright/test';

test('main UI loads and core v0.3 flows work', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');

  await expect(page).toHaveTitle('PhysicsLab AI');
  await expect(page.getByRole('complementary', { name: 'Simulation controls' })).toBeVisible();
  await expect(page.getByRole('region', { name: '3D simulation viewport' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const presetSelector = page.getByLabel('Select simulation preset');
  await expect(presetSelector).toBeVisible();
  await expect(page.getByLabel('Surface display mode')).toBeVisible();

  for (const presetId of ['soft-body-cube', 'particle-fluid', 'gravity-sandbox', 'cloth-sheet']) {
    await presetSelector.selectOption(presetId);
    await expect(page.locator('canvas')).toBeVisible();
  }

  await page.getByLabel('Benchmark run name').fill('Smoke baseline');
  await page.getByRole('button', { name: 'Run Benchmark' }).click();
  await expect(page.getByLabel('Benchmark results')).toContainText('Soft Body Cube', { timeout: 20_000 });
  await expect(page.getByLabel('Benchmark results')).toContainText('Cloth Sheet');
  await expect(page.getByLabel('Benchmark results')).toContainText('Baseline: Smoke baseline');

  const assistantInput = page.getByLabel('Assistant command');
  await expect(assistantInput).toBeVisible();
  await assistantInput.fill('Create a low-gravity jelly cube scene');
  await page.getByRole('button', { name: 'Send command' }).click();
  await expect(page.getByRole('log')).toContainText('Generated "Low-Gravity Jelly Cube"');
  await expect(page.getByLabel('Assistant parameter changes')).toContainText('gravity');
});
