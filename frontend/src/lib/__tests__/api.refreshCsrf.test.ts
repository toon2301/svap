/**
 * Obnova prihlásenia a CSRF cookie (nález 245). Logy Railway ukázali `POST /api/token/refresh/` s 403 pre chýbajúce CSRF
 * cookie: prehliadač držal token aj v pamäti stránky, `getCsrfToken()` ho vracal, aj keď cookie zmizla (napr.
 * `Clear-Site-Data: "cookies"` pri odhlásení), a obnova poslala hlavičku bez cookie. Test používa skutočný `api.ts` aj
 * `csrf.ts` a zosimuluje same-origin server: obnova bez cookie dostane 403, s cookie prejde.
 */
const mockJar: Record<string, string> = {};

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    get: (name: string) => mockJar[name],
    set: (name: string, value: string) => {
      mockJar[name] = value;
    },
    remove: (name: string) => {
      delete mockJar[name];
    },
  },
}));

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    ...actual,
    get: jest.fn(),
    post: jest.fn(),
    Axios: actual.Axios,
    AxiosError: actual.AxiosError,
    default: actual,
  };
});

type AxiosMock = { get: jest.Mock; post: jest.Mock };

type Loaded = {
  axios: AxiosMock;
  csrf: typeof import('@/utils/csrf');
  api: typeof import('@/lib/api');
};

type RefreshCall = { header?: string; cookie?: string; withCredentials?: boolean };

/** Nastavenia, s ktorými `api.ts` posiela obnovu (`axios.post`). */
type PostConfig = { headers?: Record<string, string>; withCredentials?: boolean };

/** Načíta `csrf.ts` aj `api.ts` v čerstvom registri modulov (stav tokenu v pamäti sa medzi testami nezdieľa). */
function load(apiUrl: string): Loaded {
  process.env.NEXT_PUBLIC_API_URL = apiUrl;
  let loaded!: Loaded;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const axiosModule = require('axios');
    const axios = axiosModule.default ?? axiosModule;
    loaded = {
      axios,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      csrf: require('@/utils/csrf'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      api: require('@/lib/api'),
    };
  });
  return loaded;
}

/**
 * Same-origin server: `GET csrf-token` vráti `tok-1`, `tok-2`, ... a (ak `cookieReadable`) nastaví ho aj do cookie.
 * `POST` obnovy bez cookie dostane 403 „CSRF cookie not set“, s cookie prejde. Vráti zoznam volaní obnovy.
 */
function emulateServer(axios: AxiosMock, options: { cookieReadable?: boolean; csrfFetchFails?: boolean } = {}) {
  const { cookieReadable = true, csrfFetchFails = false } = options;
  let issued = 0;
  jest.spyOn(axios, 'get').mockImplementation(async () => {
    if (csrfFetchFails) {
      throw Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' });
    }
    issued += 1;
    const token = `tok-${issued}`;
    if (cookieReadable) mockJar.csrftoken = token;
    return { status: 200, data: { csrf_token: token }, headers: {} };
  });
  const refreshCalls: RefreshCall[] = [];
  jest.spyOn(axios, 'post').mockImplementation(async (_url: string, _body: unknown, config: PostConfig) => {
    refreshCalls.push({
      header: config?.headers?.['X-CSRFToken'],
      cookie: mockJar.csrftoken,
      withCredentials: config?.withCredentials,
    });
    if (cookieReadable && !mockJar.csrftoken) {
      throw Object.assign(new Error('Request failed with status code 403'), {
        response: { status: 403, data: 'CSRF Failed: CSRF cookie not set.' },
      });
    }
    return { status: 200, data: {}, headers: {} };
  });
  return { refreshCalls };
}

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

beforeEach(() => {
  for (const key of Object.keys(mockJar)) delete mockJar[key];
  jest.restoreAllMocks();
});

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

describe('ensureSessionRefreshed a CSRF cookie pri same-origin API', () => {
  it('po zmiznutí cookie načíta token znova a obnova prejde s hlavičkou aj cookie', async () => {
    const { axios, csrf, api } = load('/api');
    const server = emulateServer(axios);
    await csrf.fetchCsrfToken();
    delete mockJar.csrftoken; // napr. Clear-Site-Data: "cookies"; token v pamäti stránky ostal
    axios.get.mockClear();

    const result = await api.ensureSessionRefreshed();

    expect(result).toBe('refreshed');
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(server.refreshCalls).toEqual([{ header: 'tok-2', cookie: 'tok-2', withCredentials: true }]);
  });

  it('s platnou cookie token znova nenačítava a hlavička sa zhoduje s cookie', async () => {
    const { axios, csrf, api } = load('/api');
    const server = emulateServer(axios);
    await csrf.fetchCsrfToken();
    axios.get.mockClear();

    const result = await api.ensureSessionRefreshed();

    expect(result).toBe('refreshed');
    expect(axios.get).not.toHaveBeenCalled();
    expect(server.refreshCalls).toEqual([{ header: 'tok-1', cookie: 'tok-1', withCredentials: true }]);
  });

  it('keď sa nový token nepodarí načítať, obnova nezavesí a skončí ako prechodné zlyhanie', async () => {
    const { axios, csrf, api } = load('/api');
    emulateServer(axios);
    await csrf.fetchCsrfToken();
    delete mockJar.csrftoken;
    const server = emulateServer(axios, { csrfFetchFails: true }); // nový token sa nepodarí načítať (časový limit)

    const result = await api.ensureSessionRefreshed();

    expect(result).toBe('transient_failure');
    // Obnova odišla bez hlavičky aj bez cookie (server ju odmietol), nie so starým tokenom z pamäte.
    expect(server.refreshCalls).toEqual([{ header: undefined, cookie: undefined, withCredentials: true }]);
  });
});

describe('ensureSessionRefreshed a CSRF token pri cross-origin API', () => {
  it('používa token z pamäte a znova ho nenačítava, aj keď cookie z JS nie je vidieť', async () => {
    const { axios, csrf, api } = load('https://backend.example.com/api');
    const server = emulateServer(axios, { cookieReadable: false });
    await csrf.fetchCsrfToken();
    axios.get.mockClear();

    const result = await api.ensureSessionRefreshed();

    expect(result).toBe('refreshed');
    expect(axios.get).not.toHaveBeenCalled();
    expect(server.refreshCalls).toEqual([{ header: 'tok-1', cookie: undefined, withCredentials: true }]);
  });
});
