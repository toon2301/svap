/**
 * Preklady profilu (nálezy 165 a 166): v češtine, poľštine a nemčine nesmie zostať slovenský text
 * a nové texty musia existovať vo všetkých 6 jazykoch. Kontroluje samotné súbory s textami, takže
 * zlyhá aj vtedy, keď niekto neskôr vráti hodnotu zo slovenčiny (napr. cez `sync:translations`).
 */
import sk from '../../../messages/sk.json';
import en from '../../../messages/en.json';
import cs from '../../../messages/cs.json';
import de from '../../../messages/de.json';
import pl from '../../../messages/pl.json';
import hu from '../../../messages/hu.json';

type Dictionary = Record<string, unknown>;

const dictionaries = { sk, en, cs, de, pl, hu } as Record<string, Dictionary>;
const foreignLocales = ['en', 'cs', 'de', 'pl', 'hu'] as const;

function text(locale: string, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === 'object' ? (current as Dictionary)[segment] : undefined,
      dictionaries[locale],
    );
  if (typeof value !== 'string') throw new Error(`${locale}: chýba text ${key}`);
  return value;
}

describe('„Dokončené spolupráce“ na profile (nález 165)', () => {
  const KEY = 'profile.completedCooperations';

  it.each(Object.keys(dictionaries))('%s: text existuje a nesie počet cez {count}', (locale) => {
    const value = text(locale, KEY);
    expect(value.trim()).not.toBe('');
    expect(value).toContain('{count}');
    expect(value).not.toContain('{{');
  });

  it('slovenčina ostáva „Dokončené spolupráce: {count}“', () => {
    expect(text('sk', KEY)).toBe('Dokončené spolupráce: {count}');
  });

  it.each(foreignLocales)('%s: text nie je slovenský', (locale) => {
    expect(text(locale, KEY)).not.toBe(text('sk', KEY));
  });

  // Dohoda: „Spolupráce“ sa prekladá rovnakým slovom, aké má v danom jazyku názov obrazovky Spolupráce.
  it.each(Object.keys(dictionaries))('%s: obsahuje slovo z názvu obrazovky Spolupráce', (locale) => {
    expect(text(locale, KEY).toLowerCase()).toContain(text(locale, 'requests.title').toLowerCase());
  });
});

// Texty, ktoré používateľ vidí pri cudzom profile. Cudzí jazyk nesmie mať slovenskú hodnotu.
// Výnimky sú len texty, ktoré sú v danom jazyku správne rovnaké ako po slovensky (názov aplikácie,
// „QR kód“), nie zabudnutý preklad.
function expectNotSlovakCopies(keys: readonly string[], sameAsSlovak: Record<string, readonly string[]>) {
  const pairs = foreignLocales.flatMap((locale) =>
    keys
      .filter((key) => !sameAsSlovak[locale]?.includes(key))
      .map((key) => [locale, key] as const),
  );
  it.each(pairs)('%s: %s nie je slovenský text', (locale, key) => {
    expect(text(locale, key).trim()).not.toBe('');
    expect(text(locale, key)).not.toBe(text('sk', key));
  });
}

describe('Menu cudzieho profilu a okná, ktoré otvára (nález 165)', () => {
  expectNotSlovakCopies(
    [
      'profile.block',
      'profile.report',
      'profile.share',
      'profile.sendMessage',
      'profile.reportProfile',
      'profile.reported',
      'profile.reportError',
      'profile.contactEmail',
      'profile.copyEmail',
      'profile.emailCopied',
      'profile.emailCopyFailed',
      'profile.profileShareEmailSubject',
      'profile.qrCodeAlt',
      'profile.shareQrCode',
      'common.optional',
      'common.sending',
      'common.submit',
      'reviews.reportDescription',
      'reviews.reportDescriptionPlaceholder',
      'reviews.reportReason',
    ],
    {
      cs: ['profile.profileShareEmailSubject', 'profile.qrCodeAlt', 'profile.shareQrCode'],
      pl: ['profile.profileShareEmailSubject'],
    },
  );
});
