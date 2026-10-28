/**
 * Poškodená diakritika v prekladoch (nález 203): písmená s diakritikou nahradil znak `?`, napr.
 * „Obr?zek je p??li? velk?“ namiesto „Obrázek je příliš velký“. Používateľ s českým rozhraním tak pri
 * odmietnutí veľkej fotky videl otázniky. Test kontroluje samotné súbory s textami vo všetkých 6 jazykoch,
 * takže zlyhá aj vtedy, keď ich niekto neskôr znova poškodí (napr. zápisom cez terminál bez UTF-8).
 */
import sk from '../../../messages/sk.json';
import en from '../../../messages/en.json';
import cs from '../../../messages/cs.json';
import de from '../../../messages/de.json';
import pl from '../../../messages/pl.json';
import hu from '../../../messages/hu.json';

type Dictionary = Record<string, unknown>;

const dictionaries: Record<string, Dictionary> = { sk, en, cs, de, pl, hu };

/** Znak `?` vložený do slova (písmeno–`?`–písmeno) alebo dvojica `??`: stopa po stratenej diakritike. */
const BROKEN_DIACRITICS = /[\p{L}?]\?[\p{L}?]/u;

/**
 * Posledné písmeno slova nahradené `?` tesne pred bodkou alebo čiarkou („velk?.“). Predchádzajúci vzor ho nezachytí, lebo za `?`
 * vyžaduje písmeno. Bežné otázky (`?` na konci textu, pred medzerou alebo novým riadkom) a tri bodky po otázke („zmazať?...“) prejdú.
 */
const BROKEN_FINAL_DIACRITICS = /\p{L}\?(?=[.,])(?!\.\.)/u;

/** Text je poškodený, ak nesie ktorúkoľvek zo stôp po strate diakritiky. */
function hasBrokenDiacritics(value: string): boolean {
  return BROKEN_DIACRITICS.test(value) || BROKEN_FINAL_DIACRITICS.test(value);
}

/** Zoznam „kľúč → text“ zo vnorených slovníkov; kľúče sú zapísané ako `messages.attachImage`. */
function flatten(dictionary: Dictionary, prefix = ''): Array<[string, string]> {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    if (typeof value === 'string') return [[`${prefix}${key}`, value] as [string, string]];
    if (value && typeof value === 'object') return flatten(value as Dictionary, `${prefix}${key}.`);
    return [];
  });
}

describe('preklady: diakritika sa nestratila (nález 203)', () => {
  it.each(Object.keys(dictionaries))('%s: v textoch nie je `?` namiesto písmen s diakritikou', (locale) => {
    const broken = flatten(dictionaries[locale])
      .filter(([, value]) => hasBrokenDiacritics(value))
      .map(([key, value]) => `${key}: ${value}`);

    expect(broken).toEqual([]);
  });

  it.each(Object.keys(dictionaries))('%s: v textoch nie je náhradný znak U+FFFD', (locale) => {
    const replaced = flatten(dictionaries[locale])
      .filter(([, value]) => value.includes('\uFFFD'))
      .map(([key]) => key);

    expect(replaced).toEqual([]);
  });

  it('poznáva poškodený text a nepovažuje bežné otázky za poškodenie', () => {
    expect(BROKEN_DIACRITICS.test('Obr?zek je p??li? velk?.')).toBe(true);
    expect(BROKEN_DIACRITICS.test('Usu? za??cznik')).toBe(true);
    expect(BROKEN_DIACRITICS.test('Naozaj chcete zrušiť túto žiadosť? Príjemca o tom dostane oznámenie.')).toBe(false);
    expect(BROKEN_DIACRITICS.test('Máš otázku alebo potrebuješ pomoc?\nNapíš nám')).toBe(false);
    expect(BROKEN_DIACRITICS.test('Smazat konverzaci?')).toBe(false);
  });

  it('zachytí aj posledné písmeno slova nahradené `?` pred bodkou alebo čiarkou, no nie bežné otázky', () => {
    expect(hasBrokenDiacritics('Obrázek je příliš velk?.')).toBe(true);
    expect(hasBrokenDiacritics('Je příliš velk?, zkuste menší.')).toBe(true);
    expect(hasBrokenDiacritics('Smazat konverzaci?')).toBe(false);
    expect(hasBrokenDiacritics('Naozaj chcete zrušiť túto žiadosť? Príjemca o tom dostane oznámenie.')).toBe(false);
    expect(hasBrokenDiacritics('Máš otázku alebo potrebuješ pomoc?\nNapíš nám')).toBe(false);
    expect(hasBrokenDiacritics('Naozaj to chceš zmazať?...')).toBe(false);
  });
});
