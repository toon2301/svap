describe('dashboardDebug utils', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  const resetBrowserState = () => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/dashboard');
    delete (window as Window & { __dashboardDebug?: unknown }).__dashboardDebug;
  };

  beforeEach(() => {
    jest.resetModules();
    resetBrowserState();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
    resetBrowserState();
  });

  const loadModule = () =>
    require('../debug/dashboardDebug') as typeof import('../debug/dashboardDebug');

  it('v produkcii sa zapne cez query parameter a sprístupní window API', () => {
    process.env.NODE_ENV = 'production';
    window.history.replaceState({}, '', '/dashboard/messages?dashboardDebug=1');

    const { dashboardDebug } = loadModule();
    dashboardDebug('test-event', { reason: 'query-param' });

    expect(window.__dashboardDebug).toBeDefined();
    expect(window.__dashboardDebug?.isEnabled()).toBe(true);

    const log = window.__dashboardDebug?.getLog() ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      event: 'test-event',
      path: '/dashboard/messages?dashboardDebug=1',
      payload: { reason: 'query-param' },
    });
  });

  it('v produkcii bez opt-in query parametra neloguje', () => {
    process.env.NODE_ENV = 'production';
    window.history.replaceState({}, '', '/dashboard/messages');

    const { dashboardDebug } = loadModule();
    dashboardDebug('test-event');

    expect(window.__dashboardDebug).toBeDefined();
    expect(window.__dashboardDebug?.isEnabled()).toBe(false);
    expect(window.__dashboardDebug?.getLog()).toEqual([]);
  });

  it('po zapnutí ostane aktívny v session aj po ďalšej navigácii', () => {
    process.env.NODE_ENV = 'production';
    window.history.replaceState({}, '', '/dashboard/messages?dashboardDebug=1');

    const { dashboardDebug } = loadModule();
    dashboardDebug('first-event');

    window.history.replaceState({}, '', '/dashboard/search');
    dashboardDebug('second-event');

    const log = window.__dashboardDebug?.getLog() ?? [];
    expect(window.__dashboardDebug?.isEnabled()).toBe(true);
    expect(log.map((entry) => entry.event)).toEqual(['first-event', 'second-event']);
    expect(log.map((entry) => entry.path)).toEqual([
      '/dashboard/messages?dashboardDebug=1',
      '/dashboard/search',
    ]);
  });
});
