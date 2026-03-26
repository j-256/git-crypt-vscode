# Git Crypt Diff

VSCode extension that enables viewing diffs of [git-crypt](https://github.com/AGWA/git-crypt) encrypted files.

## The Problem

VSCode's built-in git extension reads committed file content as raw blobs. For git-crypt files, these blobs are encrypted binary. This causes:

- Clicking a git-crypt file in the Source Control panel errors with "The editor could not be opened"
- The error can stall the SCM panel's refresh loop

The git CLI handles this correctly because git-crypt registers a `textconv` diff driver that decrypts on the fly. VSCode never invokes textconv.

## How It Works

The extension provides decrypted "before" content via `git show --textconv` and opens VSCode's built-in diff editor with the decrypted HEAD version on the left and the working copy on the right.

Git-crypt files are decorated with a lock badge so you can identify them at a glance.

## Usage

Three ways to view a git-crypt diff:

1. **Inline icon** -- hover over a git-crypt file in the Source Control Changes list and click the diff icon
2. **Right-click** -- right-click a file in the Source Control panel and select "Git Crypt: Show Diff"
3. **Command Palette** -- open a git-crypt file, then run `Git Crypt: Show Diff` from the palette

> **Note:** Double-clicking a git-crypt file in the Source Control panel still triggers VSCode's built-in (broken) diff. This cannot be overridden because the click handler is owned by the built-in git extension. Use the inline icon or right-click instead.

## Requirements

- [git-crypt](https://github.com/AGWA/git-crypt) installed and in PATH
- Repository must be unlocked (`git-crypt unlock`)
- VSCode >= 1.85.0

## Installation

### From source (development)

```bash
git clone <repo-url> && cd git-crypt-vscode
npm install
npm run build
```

Then symlink into your VSCode extensions directory:

```bash
# Standard VSCode
ln -sf "$(pwd)" ~/.vscode/extensions/git-crypt-vscode

# Portable VSCode (e.g. code-portable-data)
ln -sf "$(pwd)" /path/to/code-portable-data/extensions/git-crypt-vscode
```

Reload VSCode after linking.

### As a VSIX

```bash
npm run package
code --install-extension git-crypt-vscode-*.vsix
```

## Development

```bash
npm run build     # Build once
npm run watch     # Build on change
npm test          # Run unit tests
npm run package   # Create .vsix
```

Tests run against a real git-crypt-enabled repository (configured in test files as `TEST_REPO`).

## Architecture

```
src/
  extension.ts        # Activation, wiring, file decoration provider
  git.ts              # Low-level git/git-crypt command helpers (execFile, no shell)
  detector.ts         # Cached set of git-crypt files per repository
  contentProvider.ts  # Resolves git-crypt: URIs to decrypted content
  diff.ts             # Diff command (opens vscode.diff editor)
  uriUtil.ts          # Encode/decode git-crypt: URI scheme
```

The extension activates lazily (`onStartupFinished`), checks for `git-crypt` availability, scans workspace repositories for git-crypt files via `git check-attr`, and registers commands and providers. All git interaction uses `execFile` with array arguments (no shell) to prevent command injection.

## Known Limitations

- Cannot intercept the built-in SCM double-click (owned by `vscode.git`)
- Only diffs against HEAD (no multi-ref support)
- The lock badge appears on all git-crypt files in the file explorer, not just changed ones

## License

MIT
