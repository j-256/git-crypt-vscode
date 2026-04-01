# Contributing

## Development Setup

```bash
git clone https://github.com/j-256/git-crypt-vscode.git && cd git-crypt-vscode
npm install
npm run package
code --install-extension git-crypt-vscode-*.vsix
```

## Commands

```bash
npm run build     # Build once (esbuild -> dist/extension.js)
npm run watch     # Build on change
npm test          # Run unit tests (node:test + tsx)
npm run package   # Create .vsix
```

## Testing

Tests create a temporary git-crypt repo via `test/fixture.ts`. Requires `git-crypt` installed and in PATH.

```bash
npm test
```

## Architecture

```
src/
  detector.ts   # Cached set of git-crypt files per repository
  extension.ts  # Activation, PATH augmentation, wiring, file decoration provider
  git.ts        # Low-level git/git-crypt command helpers (execFile, no shell)
```

The extension activates lazily (`onStartupFinished`), augments the extension host's `process.env.PATH` so `git-crypt` is discoverable, checks for `git-crypt` availability, scans workspace repositories for git-crypt files via `git check-attr`, and registers a file decoration provider. All git interaction uses `execFile` with array arguments (no shell) to prevent command injection.

## Release Workflow

Releases are fully automated via `npm version`:

```bash
npm version patch   # or minor, major
```

This single command:

1. **preversion** -- verifies you're on `main`, runs build + tests
2. Bumps version in package.json
3. Commits the version bump and creates a `v*` tag
4. **postversion** -- pushes the commit and tag to origin

CI then takes over:

5. Runs tests
6. Validates the tag is on `main` and matches package.json version
7. Builds static git-crypt binaries for macOS (arm64) and Linux (x64, arm64)
8. Packages platform-specific VSIX files (with bundled binary) and a universal VSIX (without)
9. Creates a GitHub release with all VSIX files attached
10. Publishes all VSIX files to the VS Code Marketplace

### Dry Runs

Trigger the full build/package pipeline without publishing:

```bash
gh workflow run ci.yml --ref dev
```

This runs with `dry_run=true` (the default), which builds binaries, packages VSIX files, and verifies their contents -- but skips the GitHub release and marketplace publish steps. Uncheck `dry_run` in the GitHub UI to publish from a manual dispatch (only allowed from `main`).

### Recovery

**CI fails before publish** (tests, build, packaging): fix the issue and retag:

```bash
npm run retag
```

This force-moves the tag to the current commit and pushes it, re-triggering CI.

**Marketplace publish fails after GitHub release succeeds**: the marketplace rejects same-version re-publishes, so `retag` alone won't work. Bump the version and release again:

```bash
npm version patch
```

### Branches

- **main** -- releases happen here; `npm version` enforces this via a branch guard
- **dev** -- CI runs tests and dry-run builds; publish steps are gated behind `dry_run` input and a main-branch guard

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- **test** -- runs on every push to `main`/`dev` and on PRs to `main`
- **build-git-crypt** -- compiles static git-crypt binaries on macOS (arm64 via macos-15) and Linux (x64 and arm64 via Alpine Docker, arm64 uses QEMU). Runs on tags and `workflow_dispatch`
- **publish** -- packages platform-specific and universal VSIX files, verifies contents, optionally creates GitHub release and publishes to marketplace. Release/publish steps are controlled by the `dry_run` input (defaults to true on manual dispatch; always false on tag pushes)
