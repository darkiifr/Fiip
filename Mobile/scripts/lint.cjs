const { spawnSync } = require('node:child_process');
const path = require('node:path');

const nodePath = process.execPath;
const eslintBin = require.resolve('eslint/bin/eslint.js', { paths: [path.join(__dirname, '..')] });
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

process.exit(result.status ?? 1);
