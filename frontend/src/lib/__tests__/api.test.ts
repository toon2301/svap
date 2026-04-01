import axios from 'axios';
import Cookies from 'js-cookie';

import api, {
  endpoints,
  ensureFreshSessionForBackgroundWork,
  isSessionFreshEnough,
  setMayHaveRefreshCookie,
} from '../api';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const mockAxios = {
    __esModule: true,
    ...actual,
    get: jest.fn(),
    post: jest.fn(),
    Axios: actual.Axios,
    AxiosError: actual.AxiosError,
    default: actual,
  };
  return mockAxios;
});

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('lib/api axios instance', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    // @ts-ignore
    delete (window as any).location;
    // @ts-ignore
    window.location = { href: '' } as any;
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    setMayHaveRefreshCookie(true);
    (api as any).defaults.adapter = async (config: any) => {
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as any;
    };
  });

  it('nepridava Authorization header z JS', async () => {
    const interceptor = (api as any).interceptors.request.handlers[0].fulfilled;
    const cfg = await interceptor({ headers: {} });
    expect(cfg.headers.Authorization).toBeUndefined();
  });

  it('pri 401 sa pokusi o refresh a znovu odosle request', async () => {
    (Cookies.get as jest.Mock).mockImplementation((key: string) =>
      key === 'csrftoken' ? 'csrf123' : undefined,
    );

    const postSpy = jest
      .spyOn(axios as any, 'post')
      .mockResolvedValueOnce({ status: 200 } as any);
    const rejected = (api as any).interceptors.response.handlers[0].rejected;
    const originalRequest: any = { url: '/auth/me/', method: 'get', headers: {} };
    const res = await rejected({ response: { status: 401 }, config: originalRequest });

    expect(postSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/token\/refresh\/$/),
      {},
      expect.objectContaining({
        withCredentials: true,
        headers: { 'X-CSRFToken': 'csrf123' },
      }),
    );
    expect(originalRequest.headers.Authorization).toBeUndefined();
    expect(res.data.ok).toBe(true);
    postSpy.mockRestore();
  });

  it('pri refresh 401 skusi recovery cez /auth/me/ a zachova session', async () => {
    (Cookies.get as jest.Mock).mockImplementation((key: string) =>
      key === 'csrftoken' ? 'csrf123' : undefined,
    );

    const postSpy = jest
      .spyOn(axios as any, 'post')
      .mockRejectedValueOnce({ response: { status: 401 } } as any);
    const getSpy = jest
      .spyOn(axios as any, 'get')
      .mockResolvedValueOnce({ status: 200, data: { id: 1 } } as any);
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const rejected = (api as any).interceptors.response.handlers[0].rejected;
    const res = await rejected({
      response: { status: 401 },
      config: { url: '/auth/me/', method: 'get', headers: {} },
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/me\/$/),
      expect.objectContaining({ withCredentials: true }),
    );
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(res.data.ok).toBe(true);

    postSpy.mockRestore();
    getSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it('pri transientnom zlyhani refreshu neinvaliduje session', async () => {
    (Cookies.get as jest.Mock).mockImplementation((key: string) =>
      key === 'csrftoken' ? 'csrf123' : undefined,
    );

    const postSpy = jest
      .spyOn(axios as any, 'post')
      .mockRejectedValueOnce(new Error('refresh fail'));
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const rejected = (api as any).interceptors.response.handlers[0].rejected;
    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/auth/me/', method: 'get', headers: {} },
      }),
    ).rejects.toMatchObject({ __svaplyAuthFailure: 'transient_refresh_failure' });

    expect(dispatchSpy).not.toHaveBeenCalled();

    postSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it('pri anonymnom 401 z /auth/me/ bez refresh hintu neskusa refresh ani recovery probe', async () => {
    setMayHaveRefreshCookie(false);

    const postSpy = jest.spyOn(axios as any, 'post');
    const getSpy = jest.spyOn(axios as any, 'get');
    const rejected = (api as any).interceptors.response.handlers[0].rejected;

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/auth/me/', method: 'get', headers: {} },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(postSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();

    postSpy.mockRestore();
    getSpy.mockRestore();
  });

  it('pri CSRF 403 dotiahne novy token a request zopakuje len raz', async () => {
    (Cookies.get as jest.Mock).mockImplementation((key: string) =>
      key === 'csrftoken' ? 'csrf123' : undefined,
    );

    const getSpy = jest
      .spyOn(axios as any, 'get')
      .mockResolvedValueOnce({ status: 200, data: { csrf_token: 'csrf123' } } as any);
    const rejected = (api as any).interceptors.response.handlers[0].rejected;
    const originalRequest: any = {
      url: '/auth/messaging/conversations/open/',
      method: 'post',
      headers: {},
    };

    const res = await rejected({
      response: { status: 403, data: 'CSRF token missing' },
      config: originalRequest,
    });

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/csrf-token\/$/),
      expect.objectContaining({ withCredentials: true }),
    );
    expect(originalRequest.headers['X-CSRFToken']).toBe('csrf123');
    expect((originalRequest as any)._csrfRetry).toBe(true);
    expect(res.data.ok).toBe(true);

    getSpy.mockRestore();
  });

  it('z auth expiry headerov odvodí čerstvosť session a nevolá zbytočný refresh pre background work', async () => {
    const fulfilled = (api as any).interceptors.response.handlers[0].fulfilled;
    await fulfilled({
      status: 200,
      data: { ok: true },
      headers: { 'x-swaply-access-expires-in': '900' },
      config: { url: '/auth/me/', method: 'get' },
    });

    const postSpy = jest.spyOn(axios as any, 'post');

    await expect(ensureFreshSessionForBackgroundWork()).resolves.toBe('ready');
    expect(isSessionFreshEnough(1_000)).toBe(true);
    expect(postSpy).not.toHaveBeenCalled();

    postSpy.mockRestore();
  });

  it('pre background work preventívne refreshne session, keď access cookie čoskoro expiruje', async () => {
    const fulfilled = (api as any).interceptors.response.handlers[0].fulfilled;
    await fulfilled({
      status: 200,
      data: { ok: true },
      headers: { 'x-swaply-access-expires-in': '1' },
      config: { url: '/auth/me/', method: 'get' },
    });

    (Cookies.get as jest.Mock).mockImplementation((key: string) =>
      key === 'csrftoken' ? 'csrf123' : undefined,
    );

    const postSpy = jest.spyOn(axios as any, 'post').mockResolvedValueOnce({
      status: 200,
      headers: { 'x-swaply-access-expires-in': '900' },
    } as any);

    await expect(
      ensureFreshSessionForBackgroundWork({ minValidityMs: 5_000 }),
    ).resolves.toBe('refreshed');
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(isSessionFreshEnough(1_000)).toBe(true);

    postSpy.mockRestore();
  });

  it('exportuje endpoints', () => {
    expect(endpoints.auth.login).toBe('/auth/login/');
  });
});
