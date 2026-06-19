const { spawnSync } = require('node:child_process');
const path = require('node:path');

const bin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
const args = [
  'App.tsx',
  'src',
  '__tests__',
  '--ext',
  '.js,.jsx,.ts,.tsx',
];

const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/c', bin, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ESLINT_USE_FLAT_CONFIG: 'false',
    },
  })
  : spawnSync(bin, args, {
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
