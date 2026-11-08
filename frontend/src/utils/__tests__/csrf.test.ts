import { fetchCsrfToken, hasCsrfToken, getCsrfToken } from '../csrf';
import axios from 'axios';
import Cookies from 'js-cookie';

jest.mock('axios');
jest.mock('js-cookie');
// fetchCsrfToken loguje chyby cez logClientError (ten je v test/prod prostredí
// no-op, takže console.error sa nevolá – overujeme priamo delegáciu na logger).
jest.mock('@/utils/clientLogging', () => ({
  logClientError: jest.fn(),
}));

describe('CSRF utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCsrfToken', () => {
    it('makes GET request to csrf-token endpoint', async () => {
      (axios.get as jest.Mock).mockResolvedValue({});
      
      await fetchCsrfToken();
      
      expect(axios.get).toHaveBeenCalled();
    });

    it('handles error gracefully', async () => {
      const { logClientError } = require('@/utils/clientLogging');
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Nesmie thrownúť – chyba sa pohltí a deleguje na logClientError.
      await expect(fetchCsrfToken()).resolves.toBeUndefined();

      expect(logClientError).toHaveBeenCalled();
    });
  });

  describe('hasCsrfToken', () => {
    it('returns true when token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue('token-value');
      
      expect(hasCsrfToken()).toBe(true);
    });

    it('returns false when token does not exist', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      
      expect(hasCsrfToken()).toBe(false);
    });
  });

  describe('getCsrfToken', () => {
    it('returns token value from cookies', () => {
      (Cookies.get as jest.Mock).mockReturnValue('my-token');
      
      expect(getCsrfToken()).toBe('my-token');
    });

    it('returns undefined when no token', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      
      expect(getCsrfToken()).toBeUndefined();
    });
  });
});


/**
 * Zdroj pravdy pre CSRF token (nález 245). Server porovnáva hlavičku `X-CSRFToken` s cookie `csrftoken`, preto pri
 * same-origin API (napr. `/api` cez rewrite frontendu) rozhoduje cookie: keď zmizne (napr. `Clear-Site-Data: "cookies"`
 * pri odhlásení), token z pamäte stránky už nesmie vyjsť ako platný a volajúci ho načíta znova. Pri cross-origin API
 * cookie z JS vidieť nie je, preto ostáva token z odpovede. Každý test načíta modul v čerstvom registri, lebo stav
 * tokenu v pamäti je v module.
 */
describe('CSRF token: cookie ako zdroj pravdy pri same-origin API (nález 245)', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  let cookieJar: Record<string, string>;

  beforeEach(() => {
    // Automock `axios` a `js-cookie` je spoločný pre všetky registre modulov, preto sa volania čistia pred každým testom.
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  /**
   * Načíta `csrf.ts` s danou adresou API a "prehliadačom", ktorého cookie sa dá meniť. Server pri načítaní tokenu vráti
   * `tok-1`, `tok-2`, ... a (ak `cookieReadable`) nastaví ho aj do cookie.
   */
  function loadCsrf(apiUrl: string, options: { cookieReadable?: boolean } = {}) {
    process.env.NEXT_PUBLIC_API_URL = apiUrl;
    cookieJar = {};
    let loaded!: {
      csrf: typeof import('../csrf');
      axiosMock: { get: jest.Mock };
      logClientError: jest.Mock;
    };
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const axiosModule = require('axios');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cookiesModule = require('js-cookie');
      const axiosMock = axiosModule.default ?? axiosModule;
      const cookiesMock = cookiesModule.default ?? cookiesModule;
      cookiesMock.get.mockImplementation((name: string) => cookieJar[name]);
      let issued = 0;
      axiosMock.get.mockImplementation(async () => {
        issued += 1;
        const token = `tok-${issued}`;
        if (options.cookieReadable !== false) cookieJar.csrftoken = token;
        return { data: { csrf_token: token } };
      });
      loaded = {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        csrf: require('../csrf'),
        axiosMock,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        logClientError: require('@/utils/clientLogging').logClientError,
      };
    });
    return loaded;
  }

  it('cookie je zdrojom pravdy aj vtedy, keď sa líši od tokenu v pamäti (rotácia po prihlásení)', async () => {
    const { csrf } = loadCsrf('/api');
    await csrf.fetchCsrfToken();
    cookieJar.csrftoken = 'rotated-by-server';

    expect(csrf.getCsrfToken()).toBe('rotated-by-server');
    expect(csrf.hasCsrfToken()).toBe(true);
  });

  it('keď cookie zmizne, token z pamäte sa nepoužije; po novom načítaní je token znova k dispozícii', async () => {
    const { csrf } = loadCsrf('/api');
    await csrf.fetchCsrfToken();
    expect(csrf.getCsrfToken()).toBe('tok-1');

    delete cookieJar.csrftoken;

    expect(csrf.getCsrfToken()).toBeUndefined();
    expect(csrf.hasCsrfToken()).toBe(false);

    await csrf.fetchCsrfToken();

    expect(csrf.getCsrfToken()).toBe('tok-2');
    expect(csrf.hasCsrfToken()).toBe(true);
  });

  it('absolútna adresa API na rovnakom pôvode ako stránka sa berie ako same-origin', async () => {
    const { csrf } = loadCsrf(`${window.location.origin}/api`);
    await csrf.fetchCsrfToken();

    delete cookieJar.csrftoken;

    expect(csrf.getCsrfToken()).toBeUndefined();
  });

  it('cookie, ktorú sa nikdy nepodarilo prečítať (napr. HttpOnly), nie je zdrojom pravdy: ostáva token z pamäte', async () => {
    const { csrf } = loadCsrf('/api', { cookieReadable: false });
    await csrf.fetchCsrfToken();

    expect(csrf.getCsrfToken()).toBe('tok-1');
    expect(csrf.hasCsrfToken()).toBe(true);
  });

  it('bez cookie aj bez tokenu v pamäti nie je žiadny token', () => {
    const { csrf } = loadCsrf('/api');

    expect(csrf.getCsrfToken()).toBeUndefined();
    expect(csrf.hasCsrfToken()).toBe(false);
  });

  it('cross-origin API: token z odpovede má prednosť pred cookie a zmiznutie cookie ho nezmení', async () => {
    const { csrf } = loadCsrf('https://backend.example.com/api');
    await csrf.fetchCsrfToken();
    cookieJar.csrftoken = 'cudzia-hodnota';

    expect(csrf.getCsrfToken()).toBe('tok-1');

    delete cookieJar.csrftoken;

    expect(csrf.getCsrfToken()).toBe('tok-1');
    expect(csrf.hasCsrfToken()).toBe(true);
  });

  it('adresa API na inom porte je cross-origin aj pri rovnakom hoste', async () => {
    const { csrf } = loadCsrf('http://localhost:8000/api');
    await csrf.fetchCsrfToken();

    delete cookieJar.csrftoken;

    expect(csrf.getCsrfToken()).toBe('tok-1');
  });

  it('adresa API, ktorú sa nedá rozobrať, sa berie ako cross-origin: ostáva token z pamäte', async () => {
    const { csrf } = loadCsrf('http://[neplatná-adresa');
    await csrf.fetchCsrfToken();

    delete cookieJar.csrftoken;

    expect(csrf.getCsrfToken()).toBe('tok-1');
  });

  it('odpoveď bez tokenu predošlý token z pamäte neprepíše', async () => {
    // Cookie z cudzieho pôvodu v JS nie je vidieť, takže token vie podržať len pamäť stránky.
    const { csrf, axiosMock } = loadCsrf('https://backend.example.com/api', { cookieReadable: false });
    await csrf.fetchCsrfToken();
    axiosMock.get.mockResolvedValueOnce({ data: {} });

    await csrf.fetchCsrfToken();

    expect(csrf.getCsrfToken()).toBe('tok-1');
  });

  it('načítanie tokenu posiela cookies a má časový limit 15 s', async () => {
    const { csrf, axiosMock } = loadCsrf('/api');

    await csrf.fetchCsrfToken();

    expect(axiosMock.get).toHaveBeenCalledTimes(1);
    expect(axiosMock.get.mock.calls[0][1]).toEqual({ withCredentials: true, timeout: 15000 });
  });

  it('pri časovom limite sa chyba zaloguje a pohltí a predošlý token ostane', async () => {
    const { csrf, axiosMock, logClientError } = loadCsrf('https://backend.example.com/api');
    await csrf.fetchCsrfToken();
    axiosMock.get.mockRejectedValueOnce(Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' }));

    await expect(csrf.fetchCsrfToken()).resolves.toBeUndefined();

    expect(logClientError).toHaveBeenCalledTimes(1);
    expect(csrf.getCsrfToken()).toBe('tok-1');
  });
});
