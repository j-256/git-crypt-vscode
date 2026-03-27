import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { encodeGitCryptUri, decodeGitCryptUri } from '../src/uri-util.js';

describe('encodeGitCryptUri', () => {
  it('encodes a repo root, ref, and path into a URI string', () => {
    const uri = encodeGitCryptUri('/Users/me/repo', 'HEAD', 'src/file.ts');
    assert.ok(uri.startsWith('git-crypt://'));
    assert.ok(uri.includes('HEAD'));
    assert.ok(uri.includes('src/file.ts'));
  });

  it('round-trips through decode', () => {
    const repoRoot = '/Users/me/my-repo';
    const ref = 'HEAD';
    const relPath = 'path/to/secrets.sh';
    const uri = encodeGitCryptUri(repoRoot, ref, relPath);
    const decoded = decodeGitCryptUri(uri);
    assert.equal(decoded.repoRoot, repoRoot);
    assert.equal(decoded.ref, ref);
    assert.equal(decoded.relPath, relPath);
  });

  it('handles repo roots with special characters', () => {
    const repoRoot = '/Users/me/my repo (1)';
    const uri = encodeGitCryptUri(repoRoot, 'HEAD', 'file.txt');
    const decoded = decodeGitCryptUri(uri);
    assert.equal(decoded.repoRoot, repoRoot);
  });
});

describe('decodeGitCryptUri', () => {
  it('throws on invalid URI', () => {
    assert.throws(() => decodeGitCryptUri('file:///foo/bar'));
  });
});
