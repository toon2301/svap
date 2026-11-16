import { test } from './support/notification-category-test';

// Iba explicitný samostatný beh v dohodnutom okne; nie bežná regresia alebo dym.
// R44(b): žiadny test výzvy push ani vytváranie žiadostí medzi účtami.
test.describe.configure({ mode: 'serial', retries: 0 });
test.use({ trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block' });

test('jedna UI zmena kategórie sa zachová po F5 a všetkých sedem volieb sa vráti', async ({ changeNotificationCategory }) => {
  await changeNotificationCategory();
});
