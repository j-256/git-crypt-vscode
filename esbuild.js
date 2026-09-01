const esbuild = require('esbuild');
const {
  ESBUILD_USAGE,
  parseBuildArguments,
} = require('./esbuild-arguments');

/** @type {import('esbuild').BuildOptions} */
const opts = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
};

async function main() {
  const arguments_ = parseBuildArguments(process.argv.slice(2));
  if (arguments_.help) {
    process.stdout.write(ESBUILD_USAGE);
  } else if (arguments_.watch) {
    const context = await esbuild.context(opts);
    await context.watch();
  } else {
    await esbuild.build(opts);
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`git-crypt-vscode build: ${message}\n`);
  process.exitCode = 1;
});
