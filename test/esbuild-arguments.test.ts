import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ESBUILD_USAGE,
  parseBuildArguments,
} from '../esbuild-arguments.js';

describe('esbuild arguments', () => {
  it('keeps short and long watch options equivalent', () => {
    assert.deepEqual(parseBuildArguments(['-w']), parseBuildArguments(['--watch']));
    assert.equal(parseBuildArguments(['-w']).watch, true);
  });

  it('supports bundled boolean short options', () => {
    assert.deepEqual(parseBuildArguments(['-wh']), { help: true, watch: true });
  });

  it('documents the short and long options', () => {
    assert.match(ESBUILD_USAGE, /-w, --watch/);
    assert.match(ESBUILD_USAGE, /-h, --help/);
  });

  it('rejects unknown options instead of running a one-shot build', () => {
    assert.throws(() => parseBuildArguments(['--watc']), /Unknown option: --watc/);
    assert.throws(() => parseBuildArguments(['-x']), /Unknown option: -x/);
  });
});
