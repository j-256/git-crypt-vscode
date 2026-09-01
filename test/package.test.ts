import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

const PACKAGE_PATH = new URL('../package.json', import.meta.url);
const VSCODE_IGNORE_PATH = new URL('../.vscodeignore', import.meta.url);
const BUILD_ONLY_FILES = ['esbuild.js', 'esbuild-arguments.js'];
const ENGINE_VERSION_PATTERN = /^\^(\d+)\.(\d+)\.\d+$/;
const TYPES_VERSION_PATTERN = /^(\d+)\.(\d+)\.\d+$/;

type PackageManifest = {
  engines?: { vscode?: string };
  devDependencies?: { '@types/vscode'?: string };
};

describe('VS Code API compatibility', () => {
  it('pins the editor types to the minimum supported API level', async () => {
    const manifest = JSON.parse(await readFile(PACKAGE_PATH, 'utf8')) as PackageManifest;
    const engineVersion = manifest.engines?.vscode;
    const typesVersion = manifest.devDependencies?.['@types/vscode'];

    assert.ok(engineVersion, 'engines.vscode must be defined');
    assert.ok(typesVersion, '@types/vscode must be defined');

    const engineMatch = engineVersion.match(ENGINE_VERSION_PATTERN);
    const typesMatch = typesVersion.match(TYPES_VERSION_PATTERN);

    assert.ok(engineMatch, 'engines.vscode must use a caret range');
    assert.ok(typesMatch, '@types/vscode must use an exact version');
    assert.deepEqual(
      engineMatch.slice(1, 3),
      typesMatch.slice(1, 3),
      '@types/vscode must match engines.vscode at the major and minor API level',
    );
  });
});

describe('VSIX contents', () => {
  it('excludes build-only scripts', async () => {
    const ignoredPaths = new Set(
      (await readFile(VSCODE_IGNORE_PATH, 'utf8'))
        .split(/\r?\n/)
        .filter(Boolean),
    );

    for (const buildOnlyFile of BUILD_ONLY_FILES) {
      assert.ok(ignoredPaths.has(buildOnlyFile), `${buildOnlyFile} must be excluded from the VSIX`);
    }
  });
});
