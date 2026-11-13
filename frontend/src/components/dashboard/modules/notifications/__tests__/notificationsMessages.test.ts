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

describe('notifications.tagsAndShares: premenovaná kategória (R34)', () => {
  const TITLES: Record<Language, string> = {
    sk: 'Označenie a zdieľanie príspevku',
    cs: 'Označení a sdílení příspěvku',
    en: 'Post tags and shares',
    pl: 'Oznaczenia i udostępnienia posta',
    de: 'Markieren und Teilen von Beiträgen',
    hu: 'Bejegyzés megjelölése és megosztása',
  };
  const DESCRIPTIONS: Record<Language, string> = {
    sk: 'Keď vás niekto označí v príspevku alebo zdieľa váš príspevok',
    cs: 'Když vás někdo označí v příspěvku nebo sdílí váš příspěvek',
    en: 'When someone tags you in a post or shares your post',
    pl: 'Gdy ktoś oznaczy Cię w poście lub udostępni Twój post',
    de: 'Wenn Sie jemand in einem Beitrag markiert oder Ihren Beitrag teilt',
    hu: 'Amikor valaki megjelöli Önt egy bejegyzésben, vagy megosztja az Ön bejegyzését',
  };

  it.each(Object.keys(TITLES) as Language[])('%s: názov a opis kategórie označenia a zdieľania príspevku', (language) => {
    expect(block(language).tagsAndShares).toBe(TITLES[language]);
    expect(block(language).tagsAndSharesDesc).toBe(DESCRIPTIONS[language]);
  });

  it.each(Object.keys(TITLES) as Language[])('%s: staré kľúče likesAndComments a likesAndCommentsDesc už neexistujú', (language) => {
    expect(block(language)).not.toHaveProperty('likesAndComments');
    expect(block(language)).not.toHaveProperty('likesAndCommentsDesc');
  });

  it('názvy a opisy sa v jednotlivých jazykoch líšia (nie sú skopírované zo slovenčiny)', () => {
    const languages = Object.keys(TITLES) as Language[];
    expect(new Set(languages.map((language) => block(language).tagsAndShares)).size).toBe(languages.length);
    expect(new Set(languages.map((language) => block(language).tagsAndSharesDesc)).size).toBe(languages.length);
  });
});

describe('notifications.turnOffAllDesc: opis hlavného vypínača (R35, R39 (b))', () => {
  const EXPECTED: Record<Language, string> = {
    sk: 'Vypne všetky upozornenia okrem Správ. Nové žiadosti o zručnosť sa aj tak zobrazia v Žiadostiach, len bez odznaku.',
    cs: 'Vypne všechna upozornění kromě Zpráv. Nové žádosti o dovednost se přesto zobrazí v Žádostech, jen bez odznaku.',
    en: 'Turns off all notifications except Messages. New skill requests will still appear in Requests, just without a badge.',
    pl: 'Wyłącza wszystkie powiadomienia oprócz Wiadomości. Nowe prośby o umiejętności i tak pojawią się w Prośbach, tylko bez odznaki.',
    de: 'Schaltet alle Benachrichtigungen außer Nachrichten aus. Neue Fähigkeitsanfragen erscheinen trotzdem unter Anfragen, nur ohne Abzeichen.',
    hu: 'Kikapcsolja az összes értesítést az Üzenetek kivételével. Az új készség kérések ettől még megjelennek a Kérelmek között, csak jelvény nélkül.',
  };

  it.each(Object.keys(EXPECTED) as Language[])('%s: opis hovorí, že Správy ostanú a nové žiadosti o zručnosť sa zobrazia v Žiadostiach bez odznaku', (language) => {
    expect(block(language).turnOffAllDesc).toBe(EXPECTED[language]);
  });

  it('opisy sa v jednotlivých jazykoch líšia (nie sú skopírované zo slovenčiny)', () => {
    const texts = (Object.keys(EXPECTED) as Language[]).map((language) => block(language).turnOffAllDesc);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
