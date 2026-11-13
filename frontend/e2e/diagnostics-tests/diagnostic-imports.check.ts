import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/** Päť predtým nediagnostikovaných špecov musí používať automatický bezpečný fixture. */
test('všetkých päť špecov zachytáva aj prípravný pád cez pôvodný fixture', () => {
  const specs = ['mobile-settings-offer-watch-motion', 'offer-watch-mobile-results-return',
    'search-cache-revalidation', 'search-preview-tab-top', 'sharing-from-profile'];
  for (const name of specs) {
    const source = fs.readFileSync(path.resolve(__dirname, '..', name + '.spec.ts'), 'utf8');
    assert.match(source, /import \{ expect, test, [^\n]+ \} from '\.\/support\/diagnostic-test';/);
    assert.doesNotMatch(source, /from ['"]@playwright\/test['"]/);
  }
});
