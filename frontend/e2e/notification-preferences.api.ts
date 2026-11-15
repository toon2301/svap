import { test } from './support/notification-preferences-test';

// Samostatná konfigurácia: tri projekty postupne, jeden účet, workers=1 a bez retry.
// Pred živým behom je potrebné dohodnuté okno bez ďalších testov alebo zmien účtu.
test.describe.configure({ mode: 'serial', retries: 0 });
test.use({ serviceWorkers: 'block', preferenceKey: 'notify_likes' });

// Najmenší zásah: jedna kategória sa preklopí, GET a návrat kontrolujú všetkých sedem.
test('GET siedmich volieb a jeden PATCH kategórie sa overia a vrátia do pôvodného stavu', async ({ verifyPreferenceChange }, testInfo) => {
  if (testInfo.config.maxFailures !== 1) {
    throw new Error('Živý zápis vyžaduje samostatnú konfiguráciu s max-failures=1.');
  }
  await verifyPreferenceChange();
});
