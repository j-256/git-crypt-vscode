import * as crypto from 'node:crypto';

const SCHEME = 'git-crypt';

export function encodeGitCryptUri(repoRoot: string, ref: string, relPath: string): string {
  const rootHash = crypto.createHash('sha256').update(repoRoot).digest('hex').slice(0, 8);
  // Store repoRoot in query so it survives URI encoding round-trips
  const query = encodeURIComponent(repoRoot);
  return `${SCHEME}://${rootHash}/${encodeURIComponent(ref)}/${relPath}?${query}`;
}

export interface DecodedGitCryptUri {
  repoRoot: string;
  ref: string;
  relPath: string;
}

export function decodeGitCryptUri(uriString: string): DecodedGitCryptUri {
  if (!uriString.startsWith(`${SCHEME}://`)) {
    throw new Error(`Not a ${SCHEME} URI: ${uriString}`);
  }

  // Parse: git-crypt://<hash>/<ref>/<relPath>?<repoRoot>
  const withoutScheme = uriString.slice(`${SCHEME}://`.length);
  const queryIdx = withoutScheme.indexOf('?');
  if (queryIdx === -1) {
    throw new Error(`Malformed ${SCHEME} URI (missing query): ${uriString}`);
  }

  const pathPart = withoutScheme.slice(0, queryIdx);
  const repoRoot = decodeURIComponent(withoutScheme.slice(queryIdx + 1));

  // pathPart = "<hash>/<ref>/<relPath>"
  const firstSlash = pathPart.indexOf('/');
  if (firstSlash === -1) {
    throw new Error(`Malformed ${SCHEME} URI (missing ref): ${uriString}`);
  }

  const afterHash = pathPart.slice(firstSlash + 1);
  const secondSlash = afterHash.indexOf('/');
  if (secondSlash === -1) {
    throw new Error(`Malformed ${SCHEME} URI (missing path): ${uriString}`);
  }

  const ref = decodeURIComponent(afterHash.slice(0, secondSlash));
  const relPath = afterHash.slice(secondSlash + 1);

  return { repoRoot, ref, relPath };
}

export const GIT_CRYPT_SCHEME = SCHEME;
