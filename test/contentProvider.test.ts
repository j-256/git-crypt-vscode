import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveContent } from '../src/contentProvider.js';
import { encodeGitCryptUri } from '../src/uriUtil.js';
import { createFixture, destroyFixture, type TestFixture } from './fixture.js';

let fixture: TestFixture;
before(() => { fixture = createFixture(); });
after(() => { destroyFixture(fixture); });

describe('resolveContent', () => {
  it('returns decrypted content for a valid git-crypt file', async () => {
    const uri = encodeGitCryptUri(fixture.repoRoot, 'HEAD', fixture.encryptedFile);
    const content = await resolveContent(uri);
    assert.ok(content.startsWith('#!/bin/bash'));
  });

  it('returns error message for a nonexistent file', async () => {
    const uri = encodeGitCryptUri(fixture.repoRoot, 'HEAD', 'nonexistent.txt');
    const content = await resolveContent(uri);
    assert.ok(content.includes('Error'));
  });
});
