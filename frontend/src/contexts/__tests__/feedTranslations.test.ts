/**
 * Preklady Nástenky (nálezy 120 a 204): kód používa `feed.captionPlaceholder` (úprava príspevku),
 * `feed.commentsClose` (zatvorenie komentárov pri fotke) a `feed.openProfile` (otvorenie profilu autora),
 * no v žiadnom zo šiestich súborov s textami nebol. `t()` preto vrátilo záložný slovenský text z kódu
 * a v češtine, poľštine, nemčine, maďarčine aj angličtine sa ukázala slovenčina. Test kontroluje samotné
 * súbory s textami, takže zlyhá aj vtedy, keď niekto kľúč neskôr vynechá alebo ho `sync:translations`
 * nahradí slovenskou kópiou.
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

/** Dohodnuté texty; slovenčina je rovnaká ako záložný text v kóde, takže sa v slovenskej appke nič nemení. */
const EXPECTED: Record<string, Record<string, string>> = {
  'feed.captionPlaceholder': {
    sk: 'Čo máš na srdci?',
    cs: 'Co máš na srdci?',
    en: 'What’s on your mind?',
    pl: 'Co masz na sercu?',
    de: 'Was beschäftigt dich?',
    hu: 'Mi jár a fejedben?',
  },
  'feed.commentsClose': {
    sk: 'Zavrieť komentáre',
    cs: 'Zavřít komentáře',
    en: 'Close comments',
    pl: 'Zamknij komentarze',
    de: 'Kommentare schließen',
    hu: 'Hozzászólások bezárása',
  },
  'feed.openProfile': {
    sk: 'Otvoriť profil',
    cs: 'Otevřít profil',
    en: 'Open profile',
    pl: 'Otwórz profil',
    de: 'Profil öffnen',
    hu: 'Profil megnyitása',
  },
};

/** Text z vnoreného slovníka podľa kľúča typu `feed.openProfile`; chýbajúci text zhodí test s čitateľnou správou. */
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

const keys = Object.keys(EXPECTED);
const allRows = Object.keys(dictionaries).flatMap((locale) =>
  keys.map((key) => [locale, key, EXPECTED[key][locale]] as const),
);
const foreignRows = foreignLocales.flatMap((locale) => keys.map((key) => [locale, key] as const));

describe('Nástenka: tri chýbajúce kľúče (nálezy 120 a 204)', () => {
  it.each(allRows)('%s: %s má dohodnutý text', (locale, key, expected) => {
    expect(text(locale, key)).toBe(expected);
  });

  it.each(foreignRows)('%s: %s nie je slovenský text', (locale, key) => {
    expect(text(locale, key).trim()).not.toBe('');
    expect(text(locale, key)).not.toBe(text('sk', key));
  });
});
