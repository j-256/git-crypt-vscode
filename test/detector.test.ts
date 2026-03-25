import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { GitCryptDetector } from '../src/detector.js';

const TEST_REPO = '/tmp/test-repo';

describe('GitCryptDetector', () => {
  it('detects git-crypt files in a repo', async () => {
    const detector = new GitCryptDetector();
    await detector.refresh(TEST_REPO);
    assert.ok(detector.isGitCryptFile(TEST_REPO, 'sh/startup/secrets.sh'));
  });

  it('returns false for non-git-crypt files', async () => {
    const detector = new GitCryptDetector();
    await detector.refresh(TEST_REPO);
    assert.equal(detector.isGitCryptFile(TEST_REPO, 'CLAUDE.md'), false);
  });

  it('returns false for unknown repos', () => {
    const detector = new GitCryptDetector();
    assert.equal(detector.isGitCryptFile('/nonexistent', 'file.txt'), false);
  });

  it('returns the repo root for a file path', async () => {
    const detector = new GitCryptDetector();
    await detector.refresh(TEST_REPO);
    const result = detector.findRepoAndRelPath(TEST_REPO + '/sh/startup/secrets.sh');
    assert.ok(result);
    assert.equal(result.repoRoot, TEST_REPO);
    assert.equal(result.relPath, 'sh/startup/secrets.sh');
  });
});
