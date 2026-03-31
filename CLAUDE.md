# CLAUDE.md

## Repository Overview

VSCode extension that makes git-crypt repositories work in the Source Control panel. Augments the extension host's PATH so the git-crypt clean/smudge filter is discoverable, and decorates git-crypt files with a lock badge.

## Key Commands

```bash
npm run build     # Build with esbuild (bundles to dist/extension.js)
npm run watch     # Build on file change
npm test          # Run unit tests (node:test + tsx)
npm run package   # Create .vsix package
```

## Architecture

```
src/
  detector.ts   # GitCryptDetector: cached Set<string> of git-crypt files per repo
  extension.ts  # Activation, PATH augmentation, FileDecorationProvider, wiring
  git.ts        # execFile wrappers for git and git-crypt commands
test/
  fixture.ts    # Creates temporary git-crypt repo for tests
  *.test.ts     # Unit tests (node:test + tsx)
```

## Key Design Decisions

- **Eager registration:** Decoration provider is registered before repo scanning completes. The git extension may not have discovered repositories when we activate (`onStartupFinished`), so gating on repo state causes missed decorations.
- **PATH augmentation:** The VSCode extension host has a minimal PATH. `src/extension.ts` appends `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` to `process.env.PATH` on the shared extension host so `git-crypt` is discoverable by all extensions (including the built-in git extension's clean/smudge filter invocations). This is the extension's primary function.
- **Unlock detection via key directory:** `isRepoUnlocked()` checks for `.git/git-crypt/keys/` existence rather than parsing `git-crypt status` output (which is slow on large repos and ambiguous -- it labels managed files as "encrypted:" even when unlocked).
- **No shell execution:** All git commands use `execFile` with array arguments to prevent command injection.

## Testing

Tests create a temporary git-crypt repo via `test/fixture.ts` (requires `git-crypt` installed). Tests verify:
- Git command execution and error handling
- Detector file matching and path resolution

## Release Workflow

`npm version patch` (or minor/major) handles the entire release:

1. **preversion** -- branch guard (must be on `main`), build, test
2. Version bump, commit, `v*` tag
3. **postversion** -- pushes commit + tag to origin
4. CI: tests -> tag/version mismatch check -> package -> GitHub release -> marketplace publish

Recovery from CI failure: `npm run retag` (force-moves tag to HEAD, re-triggers CI).

Branches: `main` (releases), `dev` (test-only CI, no publish).

## Installation (Development)

Build and install a local VSIX:
```bash
npm run package
code --install-extension git-crypt-vscode-*.vsix
```
Reload VSCode to pick up changes.
