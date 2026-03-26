import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { GitCryptDetector } from '../src/detector.js';
import { createFixture, destroyFixture, type TestFixture } from './fixture.js';

let fixture: TestFixture;
before(() => { fixture = createFixture(); });
after(() => { destroyFixture(fixture); });

describe('GitCryptDetector', () => {
  it('detects git-crypt files in a repo', async () => {
    const detector = new GitCryptDetector();
    await detector.refresh(fixture.repoRoot);
    assert.ok(detector.isGitCryptFile(fixture.repoRoot, fixture.encryptedFile));
  });

  it('returns false for non-git-crypt files', async () => {
    const detector = new GitCryptDetector();
    await detector.refresh(fixture.repoRoot);
    assert.equal(detector.isGitCryptFile(fixture.repoRoot, fixture.plainFile), false);
  });

  it('returns false for unknown repos', () => {
    const detector = new GitCryptDetector();
    assert.equal(detector.isGitCryptFile('/nonexistent', 'file.txt'), false);
  });

  it('returns the repo root for a file path', async () => {
    const detector = new GitCryptDetector();
    await detector.refresh(fixture.repoRoot);
    const result = detector.findRepoAndRelPath(fixture.repoRoot + '/' + fixture.encryptedFile);
    assert.ok(result);
    assert.equal(result.repoRoot, fixture.repoRoot);
    assert.equal(result.relPath, fixture.encryptedFile);
  });
});
