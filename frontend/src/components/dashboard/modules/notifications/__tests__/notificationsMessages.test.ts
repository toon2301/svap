import cs from '../../../../../../messages/cs.json';
import de from '../../../../../../messages/de.json';
import en from '../../../../../../messages/en.json';
import hu from '../../../../../../messages/hu.json';
import pl from '../../../../../../messages/pl.json';
import sk from '../../../../../../messages/sk.json';

/**
 * Texty obrazovky Nastavenia → Upozornenia vo všetkých šiestich jazykoch (nález 321). Texty sú tu zámerne zapísané
 * doslovne, aby zmena alebo strata prekladu v súbore `messages/*.json` zlyhala.
 */
const LANGUAGES = { sk, cs, en, pl, de, hu } as const;
type Language = keyof typeof LANGUAGES;

const block = (language: Language) => LANGUAGES[language].notifications as Record<string, string>;

describe('notifications.turnOffAllDesc: opis hlavného vypínača (R35)', () => {
  const EXPECTED: Record<Language, string> = {
    sk: 'Vypne všetky upozornenia okrem Správ. Nové žiadosti o zručnosť budú chodiť ďalej.',
    cs: 'Vypne všechna upozornění kromě Zpráv. Nové žádosti o dovednost budou přicházet i nadále.',
    en: 'Turns off all notifications except Messages. New skill requests will still arrive.',
    pl: 'Wyłącza wszystkie powiadomienia oprócz Wiadomości. Nowe prośby o umiejętności będą nadal przychodzić.',
    de: 'Schaltet alle Benachrichtigungen außer Nachrichten aus. Neue Fähigkeitsanfragen kommen weiterhin an.',
    hu: 'Kikapcsolja az összes értesítést az Üzenetek kivételével. Az új készség kérések továbbra is megérkeznek.',
  };

  it.each(Object.keys(EXPECTED) as Language[])('%s: opis hovorí, že Správy ostanú a nové žiadosti o zručnosť chodia ďalej', (language) => {
    expect(block(language).turnOffAllDesc).toBe(EXPECTED[language]);
  });

  it('opisy sa v jednotlivých jazykoch líšia (nie sú skopírované zo slovenčiny)', () => {
    const texts = (Object.keys(EXPECTED) as Language[]).map((language) => block(language).turnOffAllDesc);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
