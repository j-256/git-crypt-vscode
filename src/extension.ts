import * as vscode from 'vscode';
import { isGitCryptAvailable, isRepoUnlocked } from './git.js';
import { GitCryptDetector } from './detector.js';
import { resolveContent } from './content-provider.js';
import { GIT_CRYPT_SCHEME } from './uri-util.js';
import { registerDiffCommand } from './diff.js';

const log = vscode.window.createOutputChannel('git-crypt Diff');

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
      'Encrypted by git-crypt \u2014 use the inline diff icon to view changes',
    );
  }

  refresh(): void {
    this._onDidChange.fire(undefined);
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  log.appendLine('Activating git-crypt-vscode...');

  const gitCryptAvailable = await isGitCryptAvailable();
  log.appendLine(`git-crypt available: ${gitCryptAvailable}`);
  if (!gitCryptAvailable) {
    log.appendLine('Aborting: git-crypt not found in PATH');
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

  // Register content provider, diff command, and file decorations eagerly
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(GIT_CRYPT_SCHEME, {
      async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        return resolveContent(uri.toString());
      },
    }),
  );

  registerDiffCommand(context, detector);

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
}

export function deactivate(): void {
  // Nothing to clean up -- all disposables registered via context.subscriptions
}
