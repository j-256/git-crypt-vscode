import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { gitExec, isGitCryptAvailable, isRepoUnlocked, getGitCryptFiles, getTextConv } from '../src/git.js';

// These tests require a real git repo with git-crypt configured.
// They run against the test repo which has git-crypt set up.
const TEST_REPO = '/tmp/test-repo';

describe('gitExec', () => {
  it('runs a git command and returns stdout', async () => {
    const result = await gitExec(TEST_REPO, ['rev-parse', '--git-dir']);
    assert.ok(result.stdout.trim().length > 0);
  });

  it('returns stderr and non-zero code on failure', async () => {
    const result = await gitExec(TEST_REPO, ['log', '--oneline', '-1', 'nonexistent-ref-abc123']);
    assert.notEqual(result.code, 0);
  });

  it('respects timeout', async () => {
    const result = await gitExec(TEST_REPO, ['rev-parse', 'HEAD'], 1000);
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
  it('returns true for the unlocked test repo', async () => {
    const result = await isRepoUnlocked(TEST_REPO);
    assert.equal(result, true);
  });
});

describe('getGitCryptFiles', () => {
  it('returns a non-empty set for the test repo', async () => {
    const files = await getGitCryptFiles(TEST_REPO);
    assert.ok(files.size > 0);
  });

  it('includes known git-crypt file', async () => {
    const files = await getGitCryptFiles(TEST_REPO);
    assert.ok(files.has('sh/startup/secrets.sh'));
  });
});

describe('getTextConv', () => {
  it('returns decrypted content for a git-crypt file', async () => {
    const content = await getTextConv(TEST_REPO, 'HEAD', 'sh/startup/secrets.sh');
    assert.ok(content.startsWith('#!/bin/bash'));
  });

  it('returns null for a file not in the given ref', async () => {
    const content = await getTextConv(TEST_REPO, 'HEAD', 'nonexistent-file.txt');
    assert.equal(content, null);
  });
});
