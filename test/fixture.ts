import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

const EXTRA_PATH_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'];

function getEnv(): NodeJS.ProcessEnv {
  const existing = process.env.PATH ?? '';
  const dirs = EXTRA_PATH_DIRS.filter(d => !existing.split(':').includes(d));
  const augmented = dirs.length ? `${existing}:${dirs.join(':')}` : existing;
  return { ...process.env, PATH: augmented };
}

function git(cwd: string, args: string[]): void {
  execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@test', ...args], {
    cwd,
    env: getEnv(),
    stdio: 'pipe',
  });
}

export interface TestFixture {
  repoRoot: string;
  encryptedFile: string; // relative path
  plainFile: string; // relative path
}

export function createFixture(): TestFixture {
  const repoRoot = mkdtempSync(path.join(tmpdir(), 'git-crypt-test-'));

  git(repoRoot, ['init', '-q']);
  git(repoRoot, ['commit', '--allow-empty', '-q', '-m', 'init']);

  execFileSync('git-crypt', ['init'], { cwd: repoRoot, env: getEnv(), stdio: 'pipe' });

  writeFileSync(path.join(repoRoot, '.gitattributes'), 'secret.txt filter=git-crypt diff=git-crypt\n');

  writeFileSync(path.join(repoRoot, 'secret.txt'), '#!/bin/bash\nSECRET=hello\n');
  writeFileSync(path.join(repoRoot, 'plain.txt'), 'plain content\n');

  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', 'add files']);

  return {
    repoRoot,
    encryptedFile: 'secret.txt',
    plainFile: 'plain.txt',
  };
}

export function destroyFixture(fixture: TestFixture): void {
  rmSync(fixture.repoRoot, { recursive: true, force: true });
}
