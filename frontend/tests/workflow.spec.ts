import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { technologies, technologyName } from '../src/technologies';

async function add(page: Page, tech: string) {
  const titles: Record<string, string> = { cdn: 'CDN', client: 'Client', load_balancer: 'Load balancer', application: 'Application service', cache: 'Cache', relational_database: 'Relational database', nonrelational_database: 'NoSQL database', queue: 'Message queue', worker: 'Background worker' };
  const label = `${titles[technologies[tech].type]} technology`;
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('group', { name: `${label} options`, exact: true }).getByRole('button', { name: technologyName(tech), exact: true }).click();
  await page.getByRole('button', { name: `Add ${tech}`, exact: true }).click();
}


async function connect(page: Page, source: string, operation: string, target: string) {
  await page.getByLabel('From', { exact: true }).selectOption({ label: source });
  await page.getByLabel('Operation', { exact: true }).selectOption(operation);
  await page.getByLabel('To', { exact: true }).selectOption({ label: target });
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
}

test('build, fail, revise, pass, save, reload, reopen and conflict using real services', async ({ page, context }) => {
  page.on('dialog', dialog => dialog.accept());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: /URL shortener/ }).click();
  await expect(page.getByRole('heading', { name: 'URL shortener', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  for (const tech of ['browser', 'nginx', 'service', 'postgresql']) await add(page, tech);
  await connect(page, 'Client', 'request', 'Load balancer');
  await connect(page, 'Load balancer', 'request', 'Application service');
  await connect(page, 'Application service', 'read', 'PostgreSQL');
  await connect(page, 'Application service', 'write', 'PostgreSQL');
  await page.getByRole('button', { name: 'Submit design' }).click();
  await expect(page.locator('.result-header .status-pill')).toHaveText('failed');
  await expect(page.getByText('75 / 100 · 3/4 checks')).toBeVisible();
  // Find a node by the accessible React Flow wrapper even when the layout overlaps.
  await page.getByTestId('component-service').click();
  await page.getByLabel('Instances', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Submit design' }).click();
  await expect(page.locator('.result-header .status-pill')).toHaveText('passed');
  await expect(page.getByText('100 / 100 · 4/4 checks')).toBeVisible();
  await page.getByRole('button', { name: 'fit view', exact: false }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  const stored = await (await page.request.get('/api/v1/challenges/url-shortener/draft')).json();
  expect(stored.graph.edges).toHaveLength(4);
  expect(stored.graph.nodes.find((n: { type: string }) => n.type === 'application').configuration.instances).toBe(3);
  await page.reload();
  await page.getByTestId('component-service').hover();
  await expect(page.getByRole('tooltip').getByText('3', { exact: true })).toBeVisible();
  const again = await (await page.request.get('/api/v1/challenges/url-shortener/draft')).json();
  expect(again.viewport).toEqual(stored.viewport);
  expect(again.graph).toEqual(stored.graph);
  await page.getByRole('button', { name: /^Submission history/ }).click();
  await expect(page.locator('.history-row').first()).toContainText('passed');
  await page.locator('.history-row').first().getByRole('button', { name: 'Open as draft' }).click();
  await page.getByTestId('component-service').hover();
  await expect(page.getByRole('tooltip').getByText('3', { exact: true })).toBeVisible();
  const other = await context.newPage(); other.on('dialog', dialog => dialog.accept());
  await other.goto('/challenges/url-shortener');
  await expect(other.getByTestId('component-service')).toBeVisible();
  await other.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(other.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload saved draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Reload saved draft' }).click();
  await expect(page.getByRole('button', { name: 'Reload saved draft' })).toHaveCount(0);
  await other.close();
  await page.screenshot({ path: 'test-results/workspace.png', fullPage: true });
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
});

test('component artwork exposes lesson metrics on hover and keyboard focus', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/challenges/product-catalog');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  await add(page, 'browser');
  await add(page, 'service');
  await page.getByLabel('Instances', { exact: true }).fill('6');
  await add(page, 'redis');
  await page.getByLabel('Cache memory (MB)').selectOption('512');
  await page.getByLabel('Client request output', { exact: true }).dragTo(page.getByLabel('Application service input', { exact: true }));
  await expect(page.locator('.canvas-caption')).toContainText('1 connections');
  const cache = page.getByTestId('component-redis');
  await cache.hover();
  await expect(page.getByRole('tooltip')).toContainText('512 MB');
  await expect(page.getByRole('tooltip')).toContainText('90%');
  await page.mouse.move(310, 160);
  await cache.focus();
  await expect(page.getByRole('tooltip')).toContainText('Memory');
  await cache.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const service = page.getByTestId('component-service');
  await service.focus();
  await service.press('Enter');
  await expect(page.getByLabel('Instances', { exact: true })).toHaveValue('6');
  await service.hover();
  await expect(page.getByRole('tooltip')).toContainText('12,000 requests/s');
  await expect(page.getByRole('tooltip')).toContainText('Synthetic lesson model');
  await expect(service.locator('svg.component-illustration')).toBeVisible();
  await expect(service).not.toContainText('12,000');
  await page.screenshot({ path: 'test-results/component-hover.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
});

test('notification and catalog lessons can be solved through controls', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/challenges/notification-service');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  for (const tech of ['browser', 'service', 'rabbitmq']) await add(page, tech);
  await page.getByLabel('Durable queue', { exact: true }).check();
  await add(page, 'celery');
  await page.getByLabel('Instances', { exact: true }).fill('2');
  await page.getByLabel('Acknowledge after successful processing').check();
  await add(page, 'mongodb');
  await connect(page, 'Client', 'request', 'Application service');
  await connect(page, 'Application service', 'publish', 'Message queue');
  await connect(page, 'Message queue', 'consume', 'Background worker');
  await connect(page, 'Background worker', 'write', 'MongoDB');
  await page.getByRole('button', { name: 'Submit design' }).click();
  await expect(page.getByText('100 / 100 · 6/6 checks')).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.goto('/challenges/product-catalog');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  for (const tech of ['browser', 'service']) await add(page, tech);
  await page.getByLabel('Instances', { exact: true }).fill('6');
  await add(page, 'redis');
  await page.getByLabel('Cache memory (MB)').selectOption('512');
  await add(page, 'mysql');
  await connect(page, 'Client', 'request', 'Application service');
  await connect(page, 'Application service', 'read', 'Cache');
  await connect(page, 'Application service', 'read', 'MySQL');
  await connect(page, 'Application service', 'write', 'MySQL');
  await page.getByRole('button', { name: 'Submit design' }).click();
  await expect(page.getByText('100 / 100 · 6/6 checks')).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText(/Canvas editing works best/)).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
});

async function dragArrow(page: Page, output: string, target: string) {
  // Finish over artwork, not the tiny input handle.
  const start = await page.getByLabel(output, { exact: true }).boundingBox();
  const end = await page.getByTestId(`component-${target}`).locator('.component-art').boundingBox();
  if (!start || !end) throw new Error('Missing connection endpoint');
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 15 });
  await page.mouse.up();
}

test('grouped technologies preserve configuration and arrows attach to artwork', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/challenges/notification-service');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  await expect(page.locator('.palette-group')).toHaveCount(9);
  // Every variant has its own icon in the dropdown, and selection updates the preview.
  for (const group of await page.locator('.palette-group').all()) {
    const picker = group.locator('summary');
    await picker.click();
    for (const option of await group.locator('.technology-options button').all()) {
      await expect(option.locator('svg').first()).toBeVisible();
    }
    await picker.press('Escape');
  }
  for (const tech of ['generic-client', 'service', 'sqs', 'lambda', 'dynamodb']) await add(page, tech);
  await page.getByRole('button', { name: /fit view/i }).click();
  await dragArrow(page, 'Client request output', 'service');
  await dragArrow(page, 'Application service publish output', 'sqs');
  await dragArrow(page, 'Message queue consume output', 'lambda');
  await dragArrow(page, 'Background worker write output', 'dynamodb');
  await expect(page.locator('.canvas-caption')).toContainText('4 connections');
  // Exact duplicates and incompatible semantics still give helpful errors.
  await dragArrow(page, 'Client request output', 'service');
  await expect(page.getByRole('alert')).toContainText('exact connection already exists');
  await dragArrow(page, 'Client request output', 'dynamodb');
  await expect(page.getByRole('alert')).toContainText('direction or operation is not supported');
  await page.getByTestId('component-lambda').click();
  await page.getByLabel('Instances', { exact: true }).fill('2');
  await page.getByLabel('Acknowledge after successful processing').check();
  await page.getByLabel('Component technology', { exact: true }).click();
  await page.getByRole('group', { name: 'Component technology options', exact: true }).getByRole('button', { name: 'Sidekiq', exact: true }).click();
  await expect(page.getByLabel('Instances', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Acknowledge after successful processing')).toBeChecked();
  await page.getByTestId('component-sqs').click();
  await page.getByLabel('Durable queue', { exact: true }).check();
  await page.getByRole('button', { name: 'Submit design' }).click();
  await expect(page.getByText('100 / 100 · 6/6 checks')).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('component-sidekiq')).toBeVisible();
  await expect(page.locator('.canvas-caption')).toContainText('4 connections');
  await page.getByRole('button', { name: /^Components/ }).click();
  await page.getByLabel('Relational database technology', { exact: true }).click();
  const options = page.getByRole('group', { name: 'Relational database technology options', exact: true });
  await expect(options.getByRole('button', { name: 'Oracle Database', exact: true })).toBeInViewport();
  await expect(options.getByRole('button', { name: 'Amazon RDS', exact: true })).toBeInViewport();
  await page.screenshot({ path: 'test-results/technology-picker.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
});

test('separate read and write arrows attach by dragging and survive node moves', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/challenges/product-catalog');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  for (const tech of ['service', 'oracle', 'memcached']) await add(page, tech);
  await dragArrow(page, 'Application service read output', 'oracle');
  await dragArrow(page, 'Application service write output', 'oracle');
  await dragArrow(page, 'Application service read output', 'memcached');
  await expect(page.locator('.canvas-caption')).toContainText('3 connections');
  await page.getByTestId('component-oracle').click();
  await page.getByLabel('Component label', { exact: true }).fill('Primary store');
  await page.getByLabel('Component technology', { exact: true }).click();
  await page.getByRole('group', { name: 'Component technology options', exact: true }).getByRole('button', { name: 'Amazon RDS', exact: true }).click();
  await expect(page.getByLabel('Component label', { exact: true })).toHaveValue('Primary store');
  const node = page.getByTestId('component-rds').locator('.component-art');
  const box = await node.boundingBox();
  if (!box) throw new Error('Missing node');
  await page.mouse.move(box.x + 50, box.y + 50); await page.mouse.down();
  await page.mouse.move(box.x - 70, box.y + 220, { steps: 12 }); await page.mouse.up();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  const draft = await (await page.request.get('/api/v1/challenges/product-catalog/draft')).json();
  expect(draft.graph.edges).toHaveLength(3);
  expect(draft.graph.edges.filter((e: { operation: string }) => e.operation === 'write')).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.react-flow__edge-path')).toHaveCount(3);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
});

test('CDN variants connect, persist and keep the lesson requirements', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await page.goto('/challenges/url-shortener');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  for (const tech of ['generic-client', 'generic-cdn', 'nginx', 'service', 'postgresql']) await add(page, tech);
  await page.getByTestId('component-service').click();
  await page.getByLabel('Instances', { exact: true }).fill('3');
  await dragArrow(page, 'Client request output', 'generic-cdn');
  await dragArrow(page, 'CDN request output', 'nginx');
  await connect(page, 'Load balancer', 'request', 'Application service');
  await connect(page, 'Application service', 'read', 'PostgreSQL');
  await connect(page, 'Application service', 'write', 'PostgreSQL');
  for (const tech of ['cloudflare', 'cloudfront']) {
    await page.getByTestId(`component-${tech === 'cloudflare' ? 'generic-cdn' : 'cloudflare'}`).click();
    await page.getByLabel('Component technology', { exact: true }).click();
    await page.getByRole('group', { name: 'Component technology options', exact: true }).getByRole('button', { name: technologyName(tech), exact: true }).click();
    await expect(page.getByTestId(`component-${tech}`).locator('svg.component-illustration')).toBeVisible();
  }
  await page.getByTestId('component-cloudfront').hover();
  await expect(page.getByRole('tooltip')).toContainText('Not modeled in this lesson');
  await page.getByRole('button', { name: 'Submit design' }).click();
  await expect(page.getByText('100 / 100 · 4/4 checks')).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('component-cloudfront')).toBeVisible();
  await expect(page.locator('.canvas-caption')).toContainText('5 connections');
  await page.getByTestId('component-cloudfront').click();
  await page.getByLabel('Component technology', { exact: true }).click();
  await page.screenshot({ path: 'test-results/cdn.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
});
