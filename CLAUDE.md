# CLAUDE.md

## Repository Overview

VSCode extension that enables viewing diffs of git-crypt encrypted files. Provides decrypted content via `git show --textconv` and opens VSCode's diff editor.

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
  extension.ts        # Activation, FileDecorationProvider, wiring
  git.ts              # execFile wrappers for git and git-crypt commands
  detector.ts         # GitCryptDetector: cached Set<string> of git-crypt files per repo
  contentProvider.ts  # resolveContent(): decodes git-crypt: URI -> decrypted text
  diff.ts             # showDiff(), registerDiffCommand(): opens vscode.diff editor
  uriUtil.ts          # encode/decode git-crypt://<hash>/<ref>/<path>?<repoRoot> URIs
test/
  fixture.ts          # Creates temporary git-crypt repo for tests
  *.test.ts           # Unit tests (node:test + tsx)
```

## Key Design Decisions

- **Eager command registration:** Commands and providers are registered before repo scanning completes. The git extension may not have discovered repositories when we activate (`onStartupFinished`), so gating on repo state causes "command not found" errors.
- **PATH augmentation:** The VSCode extension host has a minimal PATH. `src/git.ts` appends `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` so `git-crypt` is discoverable.
- **Unlock detection via key directory:** `isRepoUnlocked()` checks for `.git/git-crypt/keys/` existence rather than parsing `git-crypt status` output (which is slow on large repos and ambiguous -- it labels managed files as "encrypted:" even when unlocked).
- **No reactive intercept:** VSCode errors on encrypted blobs before `onDidOpenTextDocument` fires, so auto-redirecting the built-in SCM click is not possible. Users must use the inline icon, right-click, or command palette.
- **No shell execution:** All git commands use `execFile` with array arguments to prevent command injection.

## Testing

Tests create a temporary git-crypt repo via `test/fixture.ts` (requires `git-crypt` installed). Tests verify:
- Git command execution and error handling
- URI round-trip encoding/decoding
- Content resolution (decrypted output)
- Detector file matching and path resolution

## Installation (Development)

Symlink into your VSCode extensions directory and rebuild:
```bash
ln -sf "$(pwd)" ~/.vscode/extensions/git-crypt-vscode
npm run build
```
Reload VSCode to pick up changes.
