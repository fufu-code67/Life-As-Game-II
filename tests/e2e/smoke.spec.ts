import { test, expect } from '@playwright/test';

test('app boots, create quest, complete quest, streak increments', async ({ page }) => {
  await page.goto('http://localhost:5199/');
  await expect(page.getByRole('heading', { name: 'LifeAsGame II' })).toBeVisible();

  // Create quest via quick entry
  const input = page.getByLabel('New quest title');
  await input.fill('Smoke test quest');
  await input.press('Enter');
  await expect(page.getByText('Smoke test quest')).toBeVisible();

  // Complete it
  await page.getByLabel('Complete quest').click();
  await expect(page.getByText('No open quests — add one above.')).toBeVisible();

  // Streak should be 1 after first completion
  await expect(page.locator('.streak')).toContainText('🔥 1');

  // DB state: quest done
  const dbState = await page.evaluate(async () => {
    const rq = indexedDB.open('lifeasgame_v4');
    const db = await new Promise<IDBDatabase>((res, rej) => {
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    const tx = db.transaction('quests', 'readonly');
    const all = await new Promise<unknown[]>((res) => {
      const g = tx.objectStore('quests').getAll();
      g.onsuccess = () => res(g.result as unknown[]);
    });
    return all as Array<{ title: string; status: string }>;
  });
  expect(dbState.some((q) => q.title === 'Smoke test quest' && q.status === 'done')).toBe(true);
});
