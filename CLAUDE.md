# CLAUDE.md

## Repository Overview

VSCode extension that makes git-crypt repositories work in the Source Control panel. Augments the extension host's PATH so the git-crypt clean/smudge filter is discoverable, and decorates git-crypt files with a lock badge.

## Key Commands

```bash
npm run build       # Build with esbuild (bundles to dist/extension.js)
npm run watch       # Build on file change
npm test            # Run unit tests (node:test + tsx)
npm run package     # Create .vsix package
npm run reinstall   # Clean, package, and install the extension locally
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

- **`*` activation:** The extension uses `*` activation (not `onStartupFinished`) so PATH is augmented before the git extension's async repo discovery runs git operations that trigger clean/smudge filters. Combined with `extensionDependencies` on `vscode.git`, the sequence is: git extension activates and schedules async work, our extension activates immediately after and sets PATH synchronously, then the git extension's async operations find git-crypt. The `package` and `publish` scripts pass `--allow-star-activation` to suppress the vsce warning -- this is intentional since our activation is lightweight (just PATH augmentation).
- **Eager registration:** Decoration provider is registered before repo scanning completes. The git extension may not have discovered repositories when we activate, so gating on repo state causes missed decorations.
- **PATH augmentation:** The VSCode extension host has a minimal PATH. `src/extension.ts` appends `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, and the bundled `bin/` directory to `process.env.PATH` on the shared extension host so `git-crypt` is discoverable by all extensions (including the built-in git extension's clean/smudge filter invocations). User-installed git-crypt takes precedence; the bundled binary is appended last. This is the extension's primary function.
- **Bundled binary:** Platform-specific VSIX files ship a statically linked git-crypt binary (macOS arm64, Linux x64/arm64). A universal VSIX (no binary) is also published for unsupported platforms. The binary version is pinned in `git-crypt-version.txt` with a sha256 checksum.
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
4. CI: tests -> build static binaries -> package platform-specific + universal VSIX -> marketplace publish -> GitHub release

Recovery from CI failure: `npm run retag` (force-moves tag to HEAD, re-triggers CI). Marketplace publish runs before GH release creation, so a publish failure leaves no orphaned release to clean up.

Dry runs: `gh workflow run ci.yml --ref dev` runs the full build/package pipeline with `dry_run=true` (default). Marketplace publish is also guarded against non-main branches.

Branches: `main` (releases), `dev` (CI runs tests + dry-run builds, no publish).

## Installation (Development)

Build and install a local VSIX:
```bash
npm run reinstall
```
Reload VSCode to pick up changes.
