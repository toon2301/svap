const fs = require('fs');
const path = require('path');

/**
 * Canonical offer country and district registries live in the backend package.
 * Copy them into the frontend bundle when building from the monorepo checkout.
 */
const registries = [
  ['country_registry.json', 'countryRegistry.json'],
  ['district_registry.json', 'districtRegistry.json'],
];

for (const [sourceName, targetName] of registries) {
  const source = path.join(
    __dirname,
    '..',
    '..',
    'backend',
    'accounts',
    'data',
    sourceName,
  );
  const target = path.join(__dirname, '..', 'src', 'shared', targetName);

  if (!fs.existsSync(source)) {
    if (!fs.existsSync(target)) {
      console.error(
        '\n[sync-offer-registries] Missing backend source and frontend copy:',
        path.relative(path.join(__dirname, '..'), target),
      );
      process.exit(1);
    }
    continue;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log('[sync-offer-registries] Updated frontend copies from backend data.');
