import axios from 'axios';
import Cookies from 'js-cookie';
import api, { endpoints } from '../api';

// Zamedz reálnym HTTP requestom v jsdom
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const mockAxios = {
    __esModule: true,
    ...actual,
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
    // Stub adapter to zabrániť reálnym HTTP volaniam
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

it('pridáva Authorization header keď je access token (request interceptor)', async () => {
  (Cookies.get as jest.Mock).mockReturnValueOnce('token-123');
  const interceptor = (api as any).interceptors.request.handlers[0].fulfilled;
  const cfg = await interceptor({ headers: {} });
  expect(cfg.headers.Authorization).toBe('Bearer token-123');
});

  it('pri 401 sa pokúsi o refresh a znovu odošle request (response interceptor)', async () => {
  (Cookies.get as jest.Mock)
    .mockReturnValueOnce('access-old')
    .mockReturnValueOnce('refresh-xyz');

  const postSpy = jest.spyOn(axios as any, 'post').mockResolvedValueOnce({ data: { access: 'access-new' } } as any);
  const rejected = (api as any).interceptors.response.handlers[0].rejected;
  const originalRequest: any = { headers: {} };
  const res = await rejected({ response: { status: 401 }, config: originalRequest });

  expect(postSpy).toHaveBeenCalled();
  expect(originalRequest.headers.Authorization).toBe('Bearer access-new');
  expect(res.data.ok).toBe(true);
  postSpy.mockRestore();
});

  it('pri zlyhaní refreshu odstráni cookies a presmeruje na /auth/login (response interceptor)', async () => {
  (Cookies.get as jest.Mock)
    .mockReturnValueOnce('access-old')
    .mockReturnValueOnce('refresh-xyz');

  const postSpy = jest.spyOn(axios as any, 'post').mockRejectedValueOnce(new Error('refresh fail'));
  const removeSpy = jest.spyOn(Cookies, 'remove');

    const rejected = (api as any).interceptors.response.handlers[0].rejected;
    await rejected({ response: { status: 401 }, config: { headers: {} } }).catch(() => {});

  expect(removeSpy).toHaveBeenCalledWith('access_token');
  expect(removeSpy).toHaveBeenCalledWith('refresh_token');
  expect(window.location.href).toBe('/auth/login');

  postSpy.mockRestore();
});

  it('exportuje endpoints', () => {
    expect(endpoints.auth.login).toBe('/auth/login/');
  });
});


