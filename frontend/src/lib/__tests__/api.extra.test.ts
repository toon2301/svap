import Cookies from 'js-cookie';
import api from '../api';

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('api interceptors extra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds JSON Content-Type when missing on non-FormData', async () => {
    const interceptor = (api as any).interceptors.request.handlers[0].fulfilled;
    const cfg = await interceptor({ method: 'post', headers: {} });
    expect(cfg.headers['Content-Type']).toBe('application/json');
  });

  it('removes Content-Type for FormData', async () => {
    const interceptor = (api as any).interceptors.request.handlers[0].fulfilled;
    const form = new (global as any).FormData();
    const cfg = await interceptor({ method: 'post', data: form, headers: { 'Content-Type': 'multipart/form-data' } });
    expect(cfg.headers['Content-Type']).toBeUndefined();
  });

  it('adds CSRF header for modifying methods when cookie exists', async () => {
    (Cookies.get as jest.Mock).mockImplementation((key: string) => (key === 'csrftoken' ? 'csrf123' : undefined));
    const interceptor = (api as any).interceptors.request.handlers[0].fulfilled;
    const cfg = await interceptor({ method: 'patch', headers: {} });
    expect(cfg.headers['X-CSRFToken']).toBe('csrf123');
  });
});

