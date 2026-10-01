/** Text chyby z odpovede API pri akcii s kartou: `error`, potom `detail`, inak záložný text. */

import { getSkillActionErrorMessage } from './skillActionError';

const FALLBACK = 'Akciu sa nepodarilo dokončiť.';
const apiError = (data: unknown) => ({ response: { data } });

describe('getSkillActionErrorMessage', () => {
  it('vráti `error` z odpovede', () => {
    expect(getSkillActionErrorMessage(apiError({ error: 'Karta neexistuje.' }), FALLBACK)).toBe(
      'Karta neexistuje.',
    );
  });

  it('`error` má prednosť pred `detail`', () => {
    const error = apiError({ error: 'Chyba z error.', detail: 'Chyba z detail.' });
    expect(getSkillActionErrorMessage(error, FALLBACK)).toBe('Chyba z error.');
  });

  it('bez `error` vráti `detail`', () => {
    expect(getSkillActionErrorMessage(apiError({ detail: 'Chyba z detail.' }), FALLBACK)).toBe(
      'Chyba z detail.',
    );
  });

  it.each([{ error: '' }, { error: '   ' }, { error: 5 }, { error: null }, { error: { code: 1 } }])(
    'nepoužiteľný `error` (%p) prepustí `detail`',
    (data) => {
      expect(getSkillActionErrorMessage(apiError({ ...data, detail: 'Chyba z detail.' }), FALLBACK)).toBe(
        'Chyba z detail.',
      );
    },
  );

  it.each([
    {},
    { error: '', detail: '' },
    { error: '  ', detail: '  ' },
    { error: 1, detail: null },
    { detail: 42 },
  ])('odpoveď bez použiteľného textu (%p) vráti záložný text', (data) => {
    expect(getSkillActionErrorMessage(apiError(data), FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    undefined,
    null,
    'boom',
    42,
    new Error('Network Error'),
    {},
    { response: undefined },
    { response: {} },
    { response: { data: null } },
    { response: { data: 'text' } },
  ])('chyba bez dát z API (%p) vráti záložný text', (error) => {
    expect(getSkillActionErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it('text z API vráti nezmenený, bez orezania medzier', () => {
    expect(getSkillActionErrorMessage(apiError({ error: '  Chyba  ' }), FALLBACK)).toBe('  Chyba  ');
  });
});
