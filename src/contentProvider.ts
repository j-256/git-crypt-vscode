import { getTextConv } from './git.js';
import { decodeGitCryptUri } from './uriUtil.js';

export async function resolveContent(uriString: string): Promise<string> {
  const { repoRoot, ref, relPath } = decodeGitCryptUri(uriString);
  const content = await getTextConv(repoRoot, ref, relPath);
  if (content === null) {
    return `Error: could not retrieve ${ref}:${relPath}\n\ngit show --textconv failed. Is the repo unlocked?`;
  }
  return content;
}
