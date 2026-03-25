import * as vscode from 'vscode';
import { isGitCryptAvailable, isRepoUnlocked } from './git.js';
import { GitCryptDetector } from './detector.js';
import { resolveContent } from './contentProvider.js';
import { GIT_CRYPT_SCHEME } from './uriUtil.js';
import { registerDiffCommand, showDiff } from './diff.js';

const GIT_CRYPT_MAGIC = '\x00GITCRYPT\x00';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  if (!(await isGitCryptAvailable())) {
    return;
  }

  const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
  const gitApi = gitExtension?.getAPI(1);
  if (!gitApi) {
    return;
  }

  const detector = new GitCryptDetector();

  // Scan all current repos
  for (const repo of gitApi.repositories) {
    const root = repo.rootUri.fsPath;
    if (await isRepoUnlocked(root)) {
      await detector.refresh(root);
    }
  }

  // If no git-crypt files found in any repo, stay dormant
  if (detector.getRepoRoots().every(r => !detector.hasFiles(r))) {
    return;
  }

  // Register the content provider for git-crypt: URIs
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(GIT_CRYPT_SCHEME, {
      async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        return resolveContent(uri.toString());
      },
    }),
  );

  registerDiffCommand(context, detector);

  // Re-scan when repos change
  context.subscriptions.push(
    gitApi.onDidOpenRepository(async (repo: { rootUri: vscode.Uri }) => {
      const root = repo.rootUri.fsPath;
      if (await isRepoUnlocked(root)) {
        await detector.refresh(root);
      }
    }),
  );

  // Reactive intercept: detect when VSCode opens encrypted content
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async doc => {
      // Only intercept git-scheme documents (the built-in git extension's blob reads)
      if (doc.uri.scheme !== 'git') return;

      const text = doc.getText();
      if (!text.startsWith(GIT_CRYPT_MAGIC)) return;

      // Extract the file path from the git URI
      const fsPath = doc.uri.fsPath;
      const match = detector.findRepoAndRelPath(fsPath);
      if (!match) return;

      // Close the encrypted document and open our diff instead
      // Small delay to let VSCode finish opening the document
      setTimeout(async () => {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        const fileUri = vscode.Uri.file(match.repoRoot + '/' + match.relPath);
        await showDiff(detector, fileUri);
      }, 50);
    }),
  );
}

export function deactivate(): void {
  // Nothing to clean up -- all disposables registered via context.subscriptions
}
