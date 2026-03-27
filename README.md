# git-crypt Diff

[![CI](https://github.com/j-256/git-crypt-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/j-256/git-crypt-vscode/actions/workflows/ci.yml)

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

## Install

Search "git-crypt Diff" in the Extensions view, or run:

```bash
code --install-extension j-256.git-crypt-vscode
```

## Known Limitations

- Cannot intercept the built-in SCM double-click (owned by `vscode.git`)
- Only diffs against HEAD (no multi-ref support)
- The lock badge appears on all git-crypt files in the file explorer, not just changed ones

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and release workflow.

## License

MIT
