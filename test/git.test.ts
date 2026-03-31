import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { gitExec, isGitCryptAvailable, isRepoUnlocked, getGitCryptFiles } from '../src/git.js';
import { createFixture, destroyFixture, type TestFixture } from './fixture.js';

let fixture: TestFixture;
before(() => { fixture = createFixture(); });
after(() => { destroyFixture(fixture); });

describe('gitExec', () => {
  it('runs a git command and returns stdout', async () => {
    const result = await gitExec(fixture.repoRoot, ['rev-parse', '--git-dir']);
    assert.ok(result.stdout.trim().length > 0);
  });

  it('returns stderr and non-zero code on failure', async () => {
    const result = await gitExec(fixture.repoRoot, ['log', '--oneline', '-1', 'nonexistent-ref-abc123']);
    assert.notEqual(result.code, 0);
  });

  it('respects timeout', async () => {
    const result = await gitExec(fixture.repoRoot, ['rev-parse', 'HEAD'], 1000);
    assert.equal(result.code, 0);
  });
});

describe('isGitCryptAvailable', () => {
  it('returns true when git-crypt is installed', async () => {
    const result = await isGitCryptAvailable();
    assert.equal(result, true);
  });
});

describe('isRepoUnlocked', () => {
  it('returns true for an unlocked git-crypt repo', async () => {
    const result = await isRepoUnlocked(fixture.repoRoot);
    assert.equal(result, true);
  });
});

describe('getGitCryptFiles', () => {
  it('returns a non-empty set for a git-crypt repo', async () => {
    const files = await getGitCryptFiles(fixture.repoRoot);
    assert.ok(files.size > 0);
  });

  it('includes the known encrypted file', async () => {
    const files = await getGitCryptFiles(fixture.repoRoot);
    assert.ok(files.has(fixture.encryptedFile));
  });
});

