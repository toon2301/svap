describe('errorDebug utils', () => {
  const loadModule = () =>
    require('../debug/errorDebug') as typeof import('../debug/errorDebug');

  beforeEach(() => {
    jest.resetModules();
    sessionStorage.clear();
    delete (window as Window & { __errorDebug?: unknown }).__errorDebug;
    window.history.replaceState({}, '', '/');
  });

  it('captures sanitized crash report when opt-in flag is enabled', () => {
    window.history.replaceState(
      {},
      '',
      '/dashboard/users/zuzana.panikova?conversationId=9&highlight=14&errorDebug=1',
    );

    const { pushErrorDebugBreadcrumb, captureErrorDebugReport, getErrorDebugReport } = loadModule();

    pushErrorDebugBreadcrumb('dashboard-route', {
      module: 'messages',
      hasConversation: true,
    });

    const report = captureErrorDebugReport(new Error('Boom'), {
      componentStack: '\n    in DashboardContent',
    } as any);

    expect(report).not.toBeNull();
    expect(report?.route).toBe('/dashboard/users/[identifier]?conversationId=*&highlight=*&errorDebug=*');
    expect(report?.breadcrumbs).toHaveLength(1);
    expect(report?.breadcrumbs[0]).toMatchObject({
      event: 'dashboard-route',
      route: '/dashboard/users/[identifier]?conversationId=*&highlight=*&errorDebug=*',
      payload: {
        module: 'messages',
        hasConversation: true,
      },
    });
    expect(getErrorDebugReport()?.errorMessage).toBe('Boom');
  });

  it('stays disabled without opt-in in production mode', () => {
    const { pushErrorDebugBreadcrumb, captureErrorDebugReport, getErrorDebugReport, isErrorDebugEnabled } =
      loadModule();

    pushErrorDebugBreadcrumb('dashboard-route', { module: 'messages' });
    const report = captureErrorDebugReport(new Error('Boom'));

    expect(isErrorDebugEnabled()).toBe(false);
    expect(report).toBeNull();
    expect(getErrorDebugReport()).toBeNull();
  });
});
