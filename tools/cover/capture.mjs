import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { createFixture, destroyFixture } from '../../test/fixture.ts';
import { outputPath } from './browser.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = outputPath(root, 'Capture VS Code with the built extension and a disposable git-crypt repository.');
const VERSION = '1.137.0';
const executablePath = await downloadAndUnzipVSCode({ version: VERSION, cachePath: join(root, 'tools/cover/.vscode-test') });
const fixture = createFixture();
const profile = await mkdtemp(join(tmpdir(), 'git-crypt-cover-profile-'));
let app;
try {
  const workspace = join(profile, 'git-crypt-demo.code-workspace');
  await writeFile(workspace, JSON.stringify({ folders: [{ name: 'git-crypt-demo', path: fixture.repoRoot }] }));
  const settings = join(profile, 'User');
  await mkdir(settings, { recursive: true });
  await writeFile(join(settings, 'settings.json'), JSON.stringify({
    'workbench.startupEditor': 'none', 'workbench.colorTheme': 'Default Dark Modern',
    'workbench.activityBar.location': 'hidden', 'workbench.statusBar.visible': true,
    'window.titleBarStyle': 'custom', 'window.zoomLevel': 1,
    'telemetry.telemetryLevel': 'off', 'update.mode': 'none', 'extensions.autoCheckUpdates': false,
    'extensions.autoUpdate': false, 'security.workspace.trust.enabled': false,
    'editor.minimap.enabled': false, 'chat.disableAIFeatures': true,
  }));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ executablePath, env, timeout: 60_000, args: [
    '--no-sandbox', '--disable-gpu', '--skip-welcome', '--skip-release-notes',
    `--user-data-dir=${profile}`, `--extensions-dir=${join(profile, 'extensions')}`,
    `--extensionDevelopmentPath=${root}`, workspace,
  ] });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByText('secret.txt', { exact: true }).first().waitFor({ timeout: 60_000 });
  await page.getByText('secret.txt', { exact: true }).first().dblclick();
  const secondary = page.locator('[id="workbench.parts.auxiliarybar"]');
  if (await secondary.isVisible()) await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Alt+b' : 'Control+Alt+b');
  const secretRow = page.locator('.monaco-list-row').filter({ hasText: 'secret.txt' });
  await page.waitForFunction(() => {
    const row = [...document.querySelectorAll('.monaco-list-row')].find(element => element.textContent.includes('secret.txt'));
    const badge = row?.querySelector('.monaco-decoration-badge');
    return badge && getComputedStyle(badge, 'after').content.includes('\u{1F512}');
  }, { timeout: 30_000 });
  await page.mouse.move(700, 500);
  await page.keyboard.press('Escape');
  const body = await page.locator('body').innerText();
  assert.ok(body.includes('SECRET=hello'), 'The fixture must be open in the editor');
  await mkdir(dirname(output), { recursive: true });
  await page.screenshot({ path: output });
  console.log(`Captured ${output}`);
} finally {
  if (app) await app.close();
  destroyFixture(fixture);
  await rm(profile, { recursive: true, force: true });
}
