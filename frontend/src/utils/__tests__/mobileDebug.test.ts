import { isMobile, getDeviceInfo, checkNetworkConnectivity } from '../mobileDebug';

describe('mobileDebug utils', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
  });

  it('isMobile rozpozná userAgent', () => {
    const originalUA = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true,
    });
    expect(isMobile()).toBe(true);
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });

  it('getDeviceInfo vráti základné informácie', () => {
    const info = getDeviceInfo();
    expect(info).toHaveProperty('userAgent');
    expect(info).toHaveProperty('isMobile');
  });

  it('checkNetworkConnectivity vracia true pri 200 OK', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true });
    await expect(checkNetworkConnectivity()).resolves.toBe(true);
  });

  it('checkNetworkConnectivity vracia false pri chybe', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('net fail'));
    await expect(checkNetworkConnectivity()).resolves.toBe(false);
  });
});


