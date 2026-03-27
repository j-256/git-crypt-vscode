import * as crypto from 'node:crypto';

export const GIT_CRYPT_SCHEME = 'git-crypt';

export function encodeGitCryptUri(repoRoot: string, ref: string, relPath: string): string {
  const rootHash = crypto.createHash('sha256').update(repoRoot).digest('hex').slice(0, 8);
  // Store repoRoot in query so it survives URI encoding round-trips
  const query = encodeURIComponent(repoRoot);
  return `${GIT_CRYPT_SCHEME}://${rootHash}/${encodeURIComponent(ref)}/${relPath}?${query}`;
}

export interface DecodedGitCryptUri {
  repoRoot: string;
  ref: string;
  relPath: string;
}

export function decodeGitCryptUri(uriString: string): DecodedGitCryptUri {
  if (!uriString.startsWith(`${GIT_CRYPT_SCHEME}://`)) {
    throw new Error(`Not a ${GIT_CRYPT_SCHEME} URI: ${uriString}`);
  }

  // Parse: git-crypt://<hash>/<ref>/<relPath>?<repoRoot>
  const withoutScheme = uriString.slice(`${GIT_CRYPT_SCHEME}://`.length);
  const queryIdx = withoutScheme.indexOf('?');
  if (queryIdx === -1) {
    throw new Error(`Malformed ${GIT_CRYPT_SCHEME} URI (missing query): ${uriString}`);
  }

  const pathPart = withoutScheme.slice(0, queryIdx);
  const repoRoot = decodeURIComponent(withoutScheme.slice(queryIdx + 1));

  // pathPart = "<hash>/<ref>/<relPath>"
  const firstSlash = pathPart.indexOf('/');
  if (firstSlash === -1) {
    throw new Error(`Malformed ${GIT_CRYPT_SCHEME} URI (missing ref): ${uriString}`);
  }

  const afterHash = pathPart.slice(firstSlash + 1);
  const secondSlash = afterHash.indexOf('/');
  if (secondSlash === -1) {
    throw new Error(`Malformed ${GIT_CRYPT_SCHEME} URI (missing path): ${uriString}`);
  }

  const ref = decodeURIComponent(afterHash.slice(0, secondSlash));
  const relPath = afterHash.slice(secondSlash + 1);

  return { repoRoot, ref, relPath };
}
