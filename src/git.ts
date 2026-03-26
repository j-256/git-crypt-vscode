import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import * as path from 'node:path';

export interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}

const DEFAULT_TIMEOUT = 5000;

// Extra dirs to search for git-crypt (extension host PATH is often minimal)
const EXTRA_PATH_DIRS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
];

// Augmented PATH for all child processes
let augmentedPath: string | undefined;

function getEnv(): NodeJS.ProcessEnv {
  if (!augmentedPath) {
    const existing = process.env.PATH ?? '';
    const dirs = EXTRA_PATH_DIRS.filter(d => !existing.split(':').includes(d));
    augmentedPath = dirs.length ? `${existing}:${dirs.join(':')}` : existing;
  }
  return { ...process.env, PATH: augmentedPath };
}

export function gitExec(cwd: string, args: string[], timeout = DEFAULT_TIMEOUT): Promise<GitResult> {
  return new Promise(resolve => {
    execFile('git', args, { cwd, timeout, maxBuffer: 10 * 1024 * 1024, env: getEnv() }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        code: error ? (error as NodeJS.ErrnoException & { code?: number }).status ?? 1 : 0,
      });
    });
  });
}

export async function isGitCryptAvailable(): Promise<boolean> {
  return new Promise(resolve => {
    execFile('git-crypt', ['--version'], { timeout: 3000, env: getEnv() }, error => {
      resolve(!error);
    });
  });
}

export async function isRepoUnlocked(repoRoot: string): Promise<boolean> {
  // git-crypt lock removes keys; git-crypt unlock restores them
  try {
    await access(path.join(repoRoot, '.git', 'git-crypt', 'keys'));
    return true;
  } catch {
    return false;
  }
}

export async function getGitCryptFiles(repoRoot: string): Promise<Set<string>> {
  const lsResult = await gitExec(repoRoot, ['ls-files']);
  if (lsResult.code !== 0) return new Set();

  const files = lsResult.stdout.trimEnd().split('\n').filter(f => f.length > 0);
  if (files.length === 0) return new Set();

  // Pass file list via stdin to check-attr using execFile (no shell)
  const result = await new Promise<GitResult>(resolve => {
    const proc = execFile(
      'git',
      ['check-attr', 'filter', '--stdin'],
      { cwd: repoRoot, timeout: DEFAULT_TIMEOUT, maxBuffer: 10 * 1024 * 1024, env: getEnv() },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          code: error ? 1 : 0,
        });
      },
    );
    proc.stdin!.end(files.join('\n') + '\n');
  });

  if (result.code !== 0) return new Set();

  const cryptFiles = new Set<string>();
  for (const line of result.stdout.split('\n')) {
    // Format: "path: filter: git-crypt"
    const match = line.match(/^(.+?):\s*filter:\s*git-crypt$/);
    if (match) {
      cryptFiles.add(match[1]);
    }
  }
  return cryptFiles;
}

export async function getTextConv(repoRoot: string, ref: string, relPath: string): Promise<string | null> {
  const result = await gitExec(repoRoot, ['show', '--textconv', `${ref}:${relPath}`]);
  if (result.code !== 0) return null;
  return result.stdout;
}
