import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveContent } from '../src/contentProvider.js';
import { encodeGitCryptUri } from '../src/uriUtil.js';

const TEST_REPO = '/tmp/test-repo';

describe('resolveContent', () => {
  it('returns decrypted content for a valid git-crypt file', async () => {
    const uri = encodeGitCryptUri(TEST_REPO, 'HEAD', 'sh/startup/secrets.sh');
    const content = await resolveContent(uri);
    assert.ok(content.startsWith('#!/bin/bash'));
  });

  it('returns error message for a nonexistent file', async () => {
    const uri = encodeGitCryptUri(TEST_REPO, 'HEAD', 'nonexistent.txt');
    const content = await resolveContent(uri);
    assert.ok(content.includes('Error'));
  });
});
