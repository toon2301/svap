import { test } from './support/feed-comments-test';

// Nález 257: iba samostatný schválený beh, nie neohlásený zápis počas dymu alebo celej sady.
test.describe.configure({ mode: 'serial', retries: 0 });
test.use({ trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block' });

test('vlastný komentár sa v detaile pridá a zmaže a podklad sa uprace', async ({ createAndDeleteOwnComment }) => {
  await createAndDeleteOwnComment();
});

test.describe('iPhone 15 s existujúcou fotkou a komentármi', () => {
  test.use({ reusePhotoPost: true, viewport: { width: 393, height: 659 } });
  test('nový komentár je celý vo výhľade a po zmazaní ostane pôvodný príspevok zachovaný', async ({ createAndDeleteOwnComment }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Celý komentár na iPhone 15 – iba mobilný WebKit.');
    await createAndDeleteOwnComment();
  });
});
