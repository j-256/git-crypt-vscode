# git-crypt

[![CI](https://github.com/j-256/git-crypt-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/j-256/git-crypt-vscode/actions/workflows/ci.yml)

VSCode extension that makes [git-crypt](https://github.com/AGWA/git-crypt) repositories work in the Source Control panel.

## The Problem

VSCode's extension host process uses a minimal `PATH` that often excludes directories like `/opt/homebrew/bin` — even when VSCode is launched from a terminal with the full PATH configured. This means the `git-crypt` clean/smudge filter fails with `git-crypt: command not found`, which can prevent the entire repository from loading in the SCM panel.

## How It Works

On macOS and Linux, the extension ships a bundled `git-crypt` binary. No separate installation needed — the extension appends its binary to `PATH` so git's clean/smudge filters just work. If you already have git-crypt installed, your version takes precedence.

Git-crypt files are also decorated with a lock badge so you can identify them at a glance.

## Usage

With the extension installed, git-crypt files work like any other file in the Source Control panel — double-click to diff, stage with the `+` icon, etc.

## Requirements

- Repository must be unlocked (`git-crypt unlock`)
- VSCode >= 1.85.0
- **macOS and Linux:** git-crypt is included automatically
- **Windows:** Not supported ([git-crypt has limited Windows support](https://github.com/AGWA/git-crypt/blob/master/INSTALL.md))

To install git-crypt system-wide (outside VSCode), run the **git-crypt: Install git-crypt to system PATH** command from the command palette.

## Install

Search "git-crypt" in the Extensions view, or run:

```bash
code --install-extension j-256.git-crypt-vscode
```

## Known Limitations

- The lock badge appears on all git-crypt files in the file explorer, not just changed ones

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and release workflow.

## License

MIT
