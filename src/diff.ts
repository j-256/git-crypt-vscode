import * as vscode from 'vscode';
import * as path from 'node:path';
import { GitCryptDetector } from './detector.js';
import { encodeGitCryptUri, GIT_CRYPT_SCHEME } from './uriUtil.js';

export async function showDiff(
  detector: GitCryptDetector,
  resourceUri?: vscode.Uri,
): Promise<void> {
  // Determine which file to diff
  let fileUri: vscode.Uri | undefined = resourceUri;

  if (!fileUri) {
    fileUri = vscode.window.activeTextEditor?.document.uri;
  }

  if (!fileUri || fileUri.scheme !== 'file') {
    vscode.window.showWarningMessage('Git Crypt: No file selected');
    return;
  }

  const absolutePath = fileUri.fsPath;
  const match = detector.findRepoAndRelPath(absolutePath);

  if (!match) {
    vscode.window.showWarningMessage('Git Crypt: This file is not managed by git-crypt');
    return;
  }

  const { repoRoot, relPath } = match;
  const fileName = path.basename(relPath);

  const leftUriString = encodeGitCryptUri(repoRoot, 'HEAD', relPath);
  const leftUri = vscode.Uri.parse(leftUriString);
  const rightUri = fileUri;

  const title = `${fileName} (git-crypt HEAD) <-> ${fileName}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

export function registerDiffCommand(
  context: vscode.ExtensionContext,
  detector: GitCryptDetector,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('gitCrypt.showDiff', (arg?: unknown) => {
      // SCM context menu passes a SourceControlResourceState (has .resourceUri)
      // Command palette passes nothing; other callers may pass a Uri directly
      let uri: vscode.Uri | undefined;
      if (arg instanceof vscode.Uri) {
        uri = arg;
      } else if (arg && typeof arg === 'object' && 'resourceUri' in arg) {
        uri = (arg as { resourceUri: vscode.Uri }).resourceUri;
      }
      return showDiff(detector, uri);
    }),
  );
}
