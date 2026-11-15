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

describe('notifications.pushPrompt*: výzva na povolenie push pre Správy (R36 a)', () => {
  type PushPromptKey = 'pushPromptTitle' | 'pushPromptBody' | 'pushPromptEnable' | 'pushPromptDismiss' | 'pushPromptIosGuide';
  const KEYS: PushPromptKey[] = ['pushPromptTitle', 'pushPromptBody', 'pushPromptEnable', 'pushPromptDismiss', 'pushPromptIosGuide'];

  const EXPECTED: Record<Language, Record<PushPromptKey, string>> = {
    sk: {
      pushPromptTitle: 'Povoľte upozornenia na správy',
      pushPromptBody:
        'Upozornenia na správy máte zapnuté, no toto zariadenie ich ešte nemá povolené. Po povolení vám správy prídu aj vtedy, keď Svaply nemáte otvorené.',
      pushPromptEnable: 'Zapnúť upozornenia na správy v tomto zariadení',
      pushPromptDismiss: 'Nie teraz',
      pushPromptIosGuide:
        'Na iPhone a iPade fungujú upozornenia len v aplikácii pridanej na plochu. V Safari ťuknite na Zdieľať, vyberte Pridať na plochu a Svaply potom otvorte z ikony na ploche.',
    },
    cs: {
      pushPromptTitle: 'Povolte upozornění na zprávy',
      pushPromptBody:
        'Upozornění na zprávy máte zapnutá, ale toto zařízení je ještě nemá povolená. Po povolení vám zprávy přijdou i tehdy, když aplikaci Svaply nemáte otevřenou.',
      pushPromptEnable: 'Zapnout upozornění na zprávy v tomto zařízení',
      pushPromptDismiss: 'Teď ne',
      pushPromptIosGuide:
        'Na iPhonu a iPadu fungují upozornění jen v aplikaci přidané na plochu. V Safari klepněte na Sdílet, vyberte Přidat na plochu a Svaply pak otevřete z ikony na ploše.',
    },
    en: {
      pushPromptTitle: 'Allow message notifications',
      pushPromptBody:
        "Message notifications are turned on, but this device hasn't been allowed to show them yet. Once allowed, you'll get messages even when Svaply isn't open.",
      pushPromptEnable: 'Turn on message notifications on this device',
      pushPromptDismiss: 'Not now',
      pushPromptIosGuide:
        'On iPhone and iPad, notifications only work in an app added to the Home Screen. In Safari, tap Share, choose Add to Home Screen, then open Svaply from its icon on the Home Screen.',
    },
    pl: {
      pushPromptTitle: 'Zezwól na powiadomienia o wiadomościach',
      pushPromptBody:
        'Powiadomienia o wiadomościach są włączone, ale to urządzenie nie ma jeszcze na nie zezwolenia. Po zezwoleniu wiadomości będą do Ciebie docierać także wtedy, gdy aplikacja Svaply nie jest otwarta.',
      pushPromptEnable: 'Włącz powiadomienia o wiadomościach na tym urządzeniu',
      pushPromptDismiss: 'Nie teraz',
      pushPromptIosGuide:
        'Na iPhonie i iPadzie powiadomienia działają tylko w aplikacji dodanej do ekranu początkowego. W Safari dotknij Udostępnij, wybierz Dodaj do ekranu początkowego, a potem otwórz Svaply z ikony na ekranie początkowym.',
    },
    de: {
      pushPromptTitle: 'Benachrichtigungen für Nachrichten erlauben',
      pushPromptBody:
        'Benachrichtigungen für Nachrichten sind eingeschaltet, aber dieses Gerät hat sie noch nicht erlaubt. Nach der Erlaubnis erhalten Sie Nachrichten auch dann, wenn Svaply nicht geöffnet ist.',
      pushPromptEnable: 'Benachrichtigungen für Nachrichten auf diesem Gerät einschalten',
      pushPromptDismiss: 'Nicht jetzt',
      pushPromptIosGuide:
        'Auf iPhone und iPad funktionieren Benachrichtigungen nur in einer App, die zum Home-Bildschirm hinzugefügt wurde. Tippen Sie in Safari auf Teilen, wählen Sie Zum Home-Bildschirm und öffnen Sie Svaply dann über das Symbol auf dem Home-Bildschirm.',
    },
    hu: {
      pushPromptTitle: 'Engedélyezze az üzenetek értesítéseit',
      pushPromptBody:
        'Az üzenetértesítések be vannak kapcsolva, de ez az eszköz még nem engedélyezte őket. Az engedélyezés után az üzenetek akkor is megérkeznek, ha a Svaply nincs megnyitva.',
      pushPromptEnable: 'Üzenetértesítések bekapcsolása ezen az eszközön',
      pushPromptDismiss: 'Most nem',
      pushPromptIosGuide:
        'iPhone-on és iPaden az értesítések csak a főképernyőre helyezett alkalmazásban működnek. A Safariban koppintson a Megosztás gombra, válassza a Főképernyőhöz adás lehetőséget, majd nyissa meg a Svaply-t a főképernyőn lévő ikonról.',
    },
  };

  it.each(Object.keys(EXPECTED) as Language[])('%s: všetkých päť textov výzvy je preložených doslovne podľa dohodnutého znenia', (language) => {
    for (const key of KEYS) {
      expect(block(language)[key]).toBe(EXPECTED[language][key]);
    }
  });

  it.each((Object.keys(EXPECTED) as Language[]).filter((language) => language !== 'sk'))(
    '%s: texty výzvy nie sú skopírované zo slovenčiny',
    (language) => {
      for (const key of KEYS) {
        // Poľské „Nie teraz“ je rovnaké ako slovenské: ide o skutočný preklad, nie o kópiu.
        if (language === 'pl' && key === 'pushPromptDismiss') continue;
        expect(block(language)[key]).not.toBe(block('sk')[key]);
      }
    },
  );

  it('texty výzvy sa v jednotlivých jazykoch líšia (okrem zhodného „Nie teraz“ v slovenčine a poľštine)', () => {
    const languages = Object.keys(EXPECTED) as Language[];
    for (const key of KEYS) {
      const texts = languages.map((language) => block(language)[key]);
      const expectedDistinct = key === 'pushPromptDismiss' ? languages.length - 1 : languages.length;
      expect(new Set(texts).size).toBe(expectedDistinct);
    }
  });
});
