const { spawnSync } = require('node:child_process');
const path = require('node:path');

const nodePath = process.execPath;
const eslintPackageJson = require.resolve('eslint/package.json', { paths: [path.join(__dirname, '..')] });
const eslintBin = path.join(path.dirname(eslintPackageJson), 'bin', 'eslint.js');
const args = [
  eslintBin,
  'App.tsx',
  'src',
  '__tests__',
  '--ext',
  '.js,.jsx,.ts,.tsx',
];

const result = spawnSync(nodePath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ESLINT_USE_FLAT_CONFIG: 'false',
  },
});

if (result.error) {
  console.error(result.error);
}
if (result.signal) {
  console.error(`ESLint stopped with signal ${result.signal}`);
}
if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const tscBin = require.resolve('typescript/bin/tsc', { paths: [path.join(__dirname, '..')] });
const typecheck = spawnSync(nodePath, [tscBin, '--noEmit'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
process.exit(typecheck.status ?? 1);
