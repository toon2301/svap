import { test } from './support/feed-comments-test';

// Nález 257: iba samostatný schválený beh, nie neohlásený zápis počas dymu alebo celej sady.
test.describe.configure({ mode: 'serial', retries: 0 });
test.use({ trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block' });

test('vlastný komentár sa v detaile pridá a zmaže a podklad sa uprace', async ({ createAndDeleteOwnComment }) => {
  await createAndDeleteOwnComment();
});
