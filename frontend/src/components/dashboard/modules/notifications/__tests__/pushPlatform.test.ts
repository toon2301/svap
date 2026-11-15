import { isAppleMobile, isInstalledApp } from '../pushPlatform';

/**
 * Zisťovanie zariadenia pre výzvu na povolenie push (nález 321, etapa 3b). `isAppleMobile` pozná iPhone, iPad a iPod
 * podľa user agenta a iPadOS, ktorý sa predvolene hlási ako Mac, podľa dotykového displeja; `isInstalledApp` pozná
 * aplikáciu pridanú na plochu podľa `navigator.standalone` (Safari na iOS) alebo `display-mode: standalone`.
 */
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPOD =
  'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1';
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

/** Prepíše vlastnosť `navigator` (jsdom ich poskytuje cez getter na prototype); `restoreNavigator` ich vráti späť. */
const NAVIGATOR_KEYS = ['userAgent', 'platform', 'maxTouchPoints', 'standalone'] as const;

function setNavigator(values: Partial<Record<(typeof NAVIGATOR_KEYS)[number], unknown>>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, { configurable: true, value });
  }
}

function restoreNavigator() {
  for (const key of NAVIGATOR_KEYS) {
    delete (navigator as unknown as Record<string, unknown>)[key];
  }
}

/** `window.matchMedia` z nastavenia testov (zapisovateľné, no nekonfigurovateľné, preto sa len priraďuje). */
const originalMatchMedia = window.matchMedia;

/** Nahradí `window.matchMedia`; `undefined` znamená, že prehliadač ho nemá. */
function replaceMatchMedia(value: unknown) {
  (window as unknown as { matchMedia: unknown }).matchMedia = value;
}

/** Nahradí `window.matchMedia` funkciou, ktorá pre každý dopyt vráti dané `matches`. */
function setMatchMedia(matches: boolean) {
  const matchMedia = jest.fn().mockImplementation((query: string) => ({ matches, media: query }));
  replaceMatchMedia(matchMedia);
  return matchMedia;
}

afterEach(() => {
  restoreNavigator();
  replaceMatchMedia(originalMatchMedia);
});

describe('isAppleMobile', () => {
  it.each([
    ['iPhone', IPHONE, 'iPhone', 5, true],
    ['iPad so starším user agentom', IPAD, 'iPad', 5, true],
    ['iPod', IPOD, 'iPod touch', 5, true],
    ['iPadOS, ktorý sa hlási ako Mac, s dotykovým displejom', MAC, 'MacIntel', 5, true],
    ['Mac bez dotykového displeja', MAC, 'MacIntel', 0, false],
    ['Mac s jedným dotykovým bodom (hranica)', MAC, 'MacIntel', 1, false],
    ['Android', ANDROID, 'Linux armv81', 5, false],
    ['Windows s dotykovým displejom', WINDOWS, 'Win32', 10, false],
  ])('%s', (_label, userAgent, platform, maxTouchPoints, expected) => {
    setNavigator({ userAgent, platform, maxTouchPoints });

    expect(isAppleMobile()).toBe(expected);
  });

  it('chýbajúci user agent a platforma nespôsobia chybu a dajú „nie“', () => {
    setNavigator({ userAgent: undefined, platform: undefined, maxTouchPoints: undefined });

    expect(isAppleMobile()).toBe(false);
  });
});

describe('isInstalledApp', () => {
  it('`navigator.standalone` je true: nainštalovaná aplikácia, aj keď `display-mode` hovorí inak', () => {
    setNavigator({ standalone: true });
    setMatchMedia(false);

    expect(isInstalledApp()).toBe(true);
  });

  it('`display-mode: standalone` platí: nainštalovaná aplikácia (a pýta sa práve na tento režim zobrazenia)', () => {
    const matchMedia = setMatchMedia(true);

    expect(isInstalledApp()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
  });

  it('`navigator.standalone` je false a `display-mode` neplatí: karta prehliadača', () => {
    setNavigator({ standalone: false });
    setMatchMedia(false);

    expect(isInstalledApp()).toBe(false);
  });

  it('bez `navigator.standalone` a bez `display-mode`: karta prehliadača', () => {
    setMatchMedia(false);

    expect(isInstalledApp()).toBe(false);
  });

  it('chýbajúce `matchMedia` nespôsobí chybu a dá „nie“', () => {
    replaceMatchMedia(undefined);

    expect(isInstalledApp()).toBe(false);
  });

  it('`matchMedia`, ktoré vyhodí výnimku, nespôsobí chybu a dá „nie“', () => {
    replaceMatchMedia(() => {
      throw new Error('matchMedia zlyhalo');
    });

    expect(isInstalledApp()).toBe(false);
  });
});
