import '../api';

describe('api url resolution branches', () => {
  const env = process.env;
  const originalSession = global.sessionStorage;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
    // mock sessionStorage
    // @ts-ignore
    global.sessionStorage = {
      getItem: jest.fn().mockReturnValue('https://runtime.example'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    } as any;
  });

  afterEach(() => {
    process.env = env;
    // @ts-ignore
    global.sessionStorage = originalSession;
  });

  it('prefers NEXT_PUBLIC_BACKEND_ORIGIN when present', async () => {
    process.env.NEXT_PUBLIC_API_URL = '' as any;
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN = 'https://backend.example';
    const { default: apiInstance } = await import('../api');
    expect((apiInstance as any).defaults.baseURL).toBe('https://backend.example/api');
  });

  it('prefers explicit NEXT_PUBLIC_API_URL even when backend origin is set', async () => {
    process.env.NEXT_PUBLIC_API_URL = '/api';
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN = 'https://backend.example';
    const { default: apiInstance } = await import('../api');
    expect((apiInstance as any).defaults.baseURL).toBe('/api');
  });

  it('uses explicit NEXT_PUBLIC_API_URL when absolute', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://abs.example/api';
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN = '' as any;
    const { default: apiInstance } = await import('../api');
    expect((apiInstance as any).defaults.baseURL).toBe('https://abs.example/api');
  });
});

