import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { GitCryptDetector } from '../src/detector.js';
import {
  RepositoryRefreshController,
  type GitRepositoryLike,
} from '../src/repository-refresh.js';
import { createFixture, destroyFixture, type TestFixture } from './fixture.js';

const TEST_DEBOUNCE_MS = 5;
const TEST_TIMEOUT_MS = 1000;

interface FakeRepository {
  readonly repository: GitRepositoryLike;
  fireChange(): void;
  isDisposed(): boolean;
}

function createFakeRepository(repoRoot: string): FakeRepository {
  let listener: (() => void) | undefined;
  let disposed = false;

  return {
    repository: {
      rootUri: { fsPath: repoRoot },
      state: {
        onDidChange: callback => {
          listener = callback;
          return {
            dispose: () => {
              listener = undefined;
              disposed = true;
            },
          };
        },
      },
    },
    fireChange: () => listener?.(),
    isDisposed: () => disposed,
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + TEST_TIMEOUT_MS;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail('Timed out waiting for repository refresh');
    await new Promise(resolve => setTimeout(resolve, TEST_DEBOUNCE_MS));
  }
}

let fixture: TestFixture;
before(() => { fixture = createFixture(); });
after(() => { destroyFixture(fixture); });

describe('RepositoryRefreshController', () => {
  it('refreshes encrypted paths after repository state changes', async () => {
    const detector = new GitCryptDetector();
    const fake = createFakeRepository(fixture.repoRoot);
    const errors: unknown[] = [];
    const controller = new RepositoryRefreshController(
      repoRoot => detector.refresh(repoRoot),
      {
        debounceMs: TEST_DEBOUNCE_MS,
        onError: (_repoRoot, error) => errors.push(error),
      },
    );

    controller.track(fake.repository);
    await waitFor(() => detector.hasFiles(fixture.repoRoot));

    const addedFile = 'added-secret.txt';
    appendFileSync(
      path.join(fixture.repoRoot, '.gitattributes'),
      `${addedFile} filter=git-crypt diff=git-crypt\n`,
    );
    writeFileSync(path.join(fixture.repoRoot, addedFile), 'new secret\n');
    execFileSync('git', ['add', '.gitattributes', addedFile], {
      cwd: fixture.repoRoot,
      stdio: 'pipe',
    });

    assert.equal(detector.isGitCryptFile(fixture.repoRoot, addedFile), false);
    fake.fireChange();
    await waitFor(() => detector.isGitCryptFile(fixture.repoRoot, addedFile));

    assert.deepEqual(errors, []);
    controller.dispose();
  });

  it('debounces repeated repository state changes', async () => {
    const fake = createFakeRepository('/example/repository');
    let refreshCount = 0;
    const controller = new RepositoryRefreshController(
      async () => { refreshCount += 1; },
      { debounceMs: TEST_DEBOUNCE_MS },
    );

    controller.track(fake.repository);
    await waitFor(() => refreshCount === 1);

    fake.fireChange();
    fake.fireChange();
    fake.fireChange();
    await waitFor(() => refreshCount === 2);
    await new Promise(resolve => setTimeout(resolve, TEST_DEBOUNCE_MS * 3));

    assert.equal(refreshCount, 2);
    controller.dispose();
  });

  it('serializes refreshes for the same repository', async () => {
    const fake = createFakeRepository('/example/repository');
    let releaseFirst: (() => void) | undefined;
    const firstRefresh = new Promise<void>(resolve => { releaseFirst = resolve; });
    let refreshCount = 0;
    let activeRefreshes = 0;
    let maximumActiveRefreshes = 0;
    const controller = new RepositoryRefreshController(
      async () => {
        refreshCount += 1;
        activeRefreshes += 1;
        maximumActiveRefreshes = Math.max(maximumActiveRefreshes, activeRefreshes);
        if (refreshCount === 1) await firstRefresh;
        activeRefreshes -= 1;
      },
      { debounceMs: TEST_DEBOUNCE_MS },
    );

    controller.track(fake.repository);
    await waitFor(() => refreshCount === 1);

    fake.fireChange();
    await new Promise(resolve => setTimeout(resolve, TEST_DEBOUNCE_MS * 3));
    releaseFirst?.();
    await waitFor(() => refreshCount === 2);

    assert.equal(maximumActiveRefreshes, 1);
    controller.dispose();
  });

  it('cancels pending refreshes when a repository closes', async () => {
    const fake = createFakeRepository('/example/repository');
    let refreshCount = 0;
    const controller = new RepositoryRefreshController(
      async () => { refreshCount += 1; },
      { debounceMs: TEST_DEBOUNCE_MS },
    );

    controller.track(fake.repository);
    await waitFor(() => refreshCount === 1);

    fake.fireChange();
    controller.untrack(fake.repository);
    await new Promise(resolve => setTimeout(resolve, TEST_DEBOUNCE_MS * 3));

    assert.equal(refreshCount, 1);
    assert.equal(fake.isDisposed(), true);
    controller.dispose();
  });
});
