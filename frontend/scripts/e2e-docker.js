const path = require('path');
const { spawnSync } = require('child_process');

// Spustí Playwright E2E testy v oficiálnom Linux kontajneri. Na Windows
// hostiteľovi blokuje Smart App Control nepodpísané knižnice WebKitu; v Linuxe
// toto obmedzenie neplatí a je to rovnaké prostredie, aké neskôr použije CI.
// Tag image sa odvodzuje z nainštalovaného @playwright/test, aby verzia
// prehliadačov v image vždy presne sedela s verziou test runnera.
const { version } = require('@playwright/test/package.json');
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const frontendDir = path.resolve(__dirname, '..');

// Frontend je pripojený ako volume, takže test-results/ a playwright-report/
// vzniknú priamo na hostiteľovi. Ďalšie argumenty idú rovno do playwright test,
// napr. `npm run test:e2e:docker -- --project=webkit-mobile`.
const args = [
  'run', '--rm', '--init', '--ipc=host',
  '-e', 'NPM_CONFIG_UPDATE_NOTIFIER=false',
  '-v', `${frontendDir}:/work`,
  '-w', '/work',
  image,
  'npx', '--no', 'playwright', 'test', ...process.argv.slice(2),
];

console.log(`[e2e-docker] ${image}`);
const result = spawnSync('docker', args, { stdio: 'inherit' });

if (result.error) {
  console.error('[e2e-docker] Docker sa nepodarilo spustiť — beží Docker Desktop?', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
