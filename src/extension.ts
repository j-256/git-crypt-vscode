import * as vscode from 'vscode';
import * as path from 'node:path';
import * as os from 'node:os';
import { access, copyFile, chmod, mkdir } from 'node:fs/promises';
import { isGitCryptAvailable, resolveGitCryptPath, isRepoUnlocked } from './git.js';
import { GitCryptDetector } from './detector.js';

const log = vscode.window.createOutputChannel('git-crypt');

class GitCryptDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations = this._onDidChange.event;

  constructor(private detector: GitCryptDetector) {}

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== 'file') return;
    const match = this.detector.findRepoAndRelPath(uri.fsPath);
    if (!match) return;
    log.appendLine(`Decorating: ${uri.fsPath}`);
    return new vscode.FileDecoration(
      '\u{1F512}',
      'Encrypted by git-crypt',
    );
  }

  refresh(): void {
    this._onDidChange.fire(undefined);
  }
}

// Dirs to append to PATH so git-crypt is discoverable by all extensions
const EXTRA_PATH_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'];

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  log.appendLine('Activating git-crypt-vscode...');

  // Augment process PATH so the built-in git extension's child processes
  // can find git-crypt (e.g. git add triggering the clean filter).
  // Bundled binary dir is appended last so user-installed git-crypt takes precedence.
  const bundledBinDir = path.join(context.extensionPath, 'bin');
  const extraDirs = [...EXTRA_PATH_DIRS, bundledBinDir];
  const currentPath = process.env.PATH ?? '';
  const missing = extraDirs.filter(d => !currentPath.split(':').includes(d));
  if (missing.length) process.env.PATH = `${currentPath}:${missing.join(':')}`;

  // Inject into integrated terminals so git-crypt is available there too
  context.environmentVariableCollection.append('PATH', ':' + extraDirs.join(':'));

  const gitCryptAvailable = await isGitCryptAvailable();
  if (gitCryptAvailable) {
    const resolved = await resolveGitCryptPath();
    const source = resolved?.startsWith(bundledBinDir) ? 'bundled' : 'system';
    log.appendLine(`git-crypt available: ${resolved} (${source})`);
  }
  if (!gitCryptAvailable) {
    log.appendLine('Aborting: git-crypt not found in PATH');
    vscode.window.showWarningMessage(
      'git-crypt was not found. On macOS and Linux, git-crypt is included ' +
      'automatically \u2014 reinstall the extension if you\'re on a supported platform. ' +
      'On Windows, install git-crypt manually.',
    );
    return;
  }

  const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
  const gitApi = gitExtension?.getAPI(1);
  log.appendLine(`git API: ${!!gitApi}`);
  if (!gitApi) {
    log.appendLine('Aborting: git API not available');
    return;
  }

  log.appendLine(`Repositories at activation: ${gitApi.repositories.length}`);

  const detector = new GitCryptDetector();

  const decorationProvider = new GitCryptDecorationProvider(detector);
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider),
  );

  // Scan repos asynchronously -- handles both already-loaded and late-arriving repos
  async function scanRepo(rootUri: vscode.Uri): Promise<void> {
    const root = rootUri.fsPath;
    if (await isRepoUnlocked(root)) {
      await detector.refresh(root);
      decorationProvider.refresh();
      log.appendLine(`Scanned ${root}: ${detector.hasFiles(root) ? 'git-crypt files found' : 'no git-crypt files'}`);
    }
  }

  for (const repo of gitApi.repositories) {
    scanRepo(repo.rootUri);
  }

  context.subscriptions.push(
    gitApi.onDidOpenRepository((repo: { rootUri: vscode.Uri }) => {
      scanRepo(repo.rootUri);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('git-crypt.installGlobally', async () => {
      const bundledBinary = path.join(context.extensionPath, 'bin', 'git-crypt');
      try {
        await access(bundledBinary);
      } catch {
        vscode.window.showErrorMessage(
          'No bundled git-crypt binary found. Install git-crypt manually.',
        );
        return;
      }

      const options = [
        { label: '/usr/local/bin', description: 'System-wide (may require sudo)' },
        { label: '~/.local/bin', description: 'User-local, no sudo needed' },
        { label: 'Choose location...', description: 'Select a custom directory' },
      ];

      const picked = await vscode.window.showQuickPick(options, {
        placeHolder: 'Where should git-crypt be installed?',
      });
      if (!picked) return;

      let destDir: string;
      if (picked.label === 'Choose location...') {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Install here',
        });
        if (!uris?.length) return;
        destDir = uris[0].fsPath;
      } else {
        destDir = picked.label.replace('~', os.homedir());
      }

      const destPath = path.join(destDir, 'git-crypt');
      try {
        await mkdir(destDir, { recursive: true });
        await copyFile(bundledBinary, destPath);
        await chmod(destPath, 0o755);
        const onPath = (process.env.PATH ?? '').split(':').includes(destDir);
        const msg = onPath
          ? `Installed git-crypt to ${destPath}`
          : `Installed git-crypt to ${destPath}. Add ${destDir} to your shell PATH.`;
        vscode.window.showInformationMessage(msg);
        log.appendLine(msg);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('EACCES') || msg.includes('permission')) {
          vscode.window.showErrorMessage(
            `Permission denied. Run: sudo cp "${bundledBinary}" "${destPath}"`,
          );
        } else {
          vscode.window.showErrorMessage(`Failed to install git-crypt: ${msg}`);
        }
      }
    }),
  );
}

export function deactivate(): void {}
