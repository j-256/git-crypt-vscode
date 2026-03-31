import { getGitCryptFiles } from './git.js';

export class GitCryptDetector {
  private repos = new Map<string, Set<string>>();

  async refresh(repoRoot: string): Promise<void> {
    const files = await getGitCryptFiles(repoRoot);
    this.repos.set(repoRoot, files);
  }

  isGitCryptFile(repoRoot: string, relPath: string): boolean {
    const files = this.repos.get(repoRoot);
    return files?.has(relPath) ?? false;
  }

  findRepoAndRelPath(absolutePath: string): { repoRoot: string; relPath: string } | null {
    for (const repoRoot of this.repos.keys()) {
      if (absolutePath.startsWith(repoRoot + '/')) {
        const relPath = absolutePath.slice(repoRoot.length + 1);
        if (this.isGitCryptFile(repoRoot, relPath)) {
          return { repoRoot, relPath };
        }
      }
    }
    return null;
  }

  hasFiles(repoRoot: string): boolean {
    const files = this.repos.get(repoRoot);
    return (files?.size ?? 0) > 0;
  }
}
