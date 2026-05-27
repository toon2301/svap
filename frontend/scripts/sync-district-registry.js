const fs = require('fs');
const path = require('path');

/**
 * Canonical district registry lives in the backend package.
 * Copy it into the frontend bundle when building from the monorepo checkout.
 */
const source = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'accounts',
  'data',
  'district_registry.json',
);
const target = path.join(__dirname, '..', 'src', 'shared', 'districtRegistry.json');

if (!fs.existsSync(source)) {
  if (!fs.existsSync(target)) {
    console.error(
      '\n[sync-district-registry] Missing backend source and frontend copy:',
      path.relative(path.join(__dirname, '..'), target),
    );
    process.exit(1);
  }
  return;
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log('[sync-district-registry] Updated frontend copy from backend data.');
