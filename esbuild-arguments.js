const ESBUILD_USAGE = `Usage: node esbuild.js [options]

Options:
  -w, --watch   Rebuild when source files change
  -h, --help    Show this help
`;

function parseBuildArguments(argv) {
  const parsed = { help: false, watch: false };

  for (const argument of argv) {
    if (argument === '--watch') {
      parsed.watch = true;
    } else if (argument === '--help') {
      parsed.help = true;
    } else if (/^-[^-]+$/.test(argument)) {
      for (const option of argument.slice(1)) {
        if (option === 'w') parsed.watch = true;
        else if (option === 'h') parsed.help = true;
        else throw new Error(`Unknown option: -${option}`);
      }
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return parsed;
}

module.exports = { ESBUILD_USAGE, parseBuildArguments };
