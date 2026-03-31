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

5. Runs tests on the pushed tag
6. Validates the tag matches package.json version
7. Packages the VSIX and creates a GitHub release with it attached
8. Publishes to the VS Code Marketplace

### Recovery

If CI fails after the tag is pushed (e.g. marketplace timeout), fix the issue and retag:

```bash
npm run retag
```

This force-moves the tag to the current commit and pushes it, re-triggering CI.

### Branches

- **main** -- releases happen here; `npm version` enforces this via a branch guard
- **dev** -- CI runs tests only; publish job verifies the tag is on main before proceeding

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- **test** job runs on every push to `main`/`dev` and on PRs to `main`
- **publish** job runs only on `v*` tags on `main`, after tests pass
