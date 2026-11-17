import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSinglePreferenceRun } from '../support/notification-preferences-options';

test('API CLI bez opakovania alebo s presne jedným opakovaním zostáva povolené', () => {
  for (const args of [[], ['test'], ['--repeat-each=1'], ['--repeat-each', '1'],
    ['--workers=1', '--retries=0', '--repeat-each=1']]) {
    assert.doesNotThrow(() => requireSinglePreferenceRun(args));
  }
});

test('API CLI odmietne obe syntaxe nebezpečného počtu aj neplatný vstup', () => {
  for (const value of ['0', '2', '10', '-1', '1.5', 'NaN', '']) {
    for (const args of [[`--repeat-each=${value}`], ['--repeat-each', value]]) {
      assert.throws(() => requireSinglePreferenceRun(args), /E2E_PREFERENCES_REPEATS_REJECTED/);
    }
  }
  assert.throws(() => requireSinglePreferenceRun(['--repeat-each']), /E2E_PREFERENCES_REPEATS_REJECTED/);
});

test('API CLI nesmie prekryť zakázané opakovanie neskoršou hodnotou jedna', () => {
  for (const args of [['--repeat-each=2', '--repeat-each=1'], ['--repeat-each=1', '--repeat-each=2']]) {
    assert.throws(() => requireSinglePreferenceRun(args), /E2E_PREFERENCES_REPEATS_REJECTED/);
  }
});

test('chyba API poistky nevypíše súkromný vstup ani odkaz na UI scenár', () => {
  const privateValue = 'SYNTHETIC_PRIVATE_REPEAT_NEVER_PRINT';
  assert.throws(() => requireSinglePreferenceRun([`--repeat-each=${privateValue}`]), error => error instanceof Error
    && error.message.includes('E2E_PREFERENCES_REPEATS_REJECTED')
    && !error.message.includes(privateValue) && !error.message.includes('UI skúška'));
});
