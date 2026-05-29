import {
  normalizeSentryPath,
  safeSentryTracesSampleRate,
  sanitizeSentryEvent,
} from '../sentryConfig';

describe('sentryConfig', () => {
  it('caps traces sampling below 100 percent', () => {
    expect(safeSentryTracesSampleRate('1', 0.05)).toBe(0.2);
    expect(safeSentryTracesSampleRate('0.15', 0.05)).toBe(0.15);
    expect(safeSentryTracesSampleRate('invalid', 0.05)).toBe(0.05);
    expect(safeSentryTracesSampleRate('-1', 0.05)).toBe(0);
  });

  it('normalizes paths and strips query strings', () => {
    expect(normalizeSentryPath('GET https://api.example.com/api/users/123/?email=a@b.test')).toBe(
      '/api/users/:id/',
    );
    expect(normalizeSentryPath('/dashboard/users/abc@example.com')).toBe('/dashboard/users/:value');
  });

  it('sanitizes request data and http spans', () => {
    const event = sanitizeSentryEvent({
      transaction: 'https://api.example.com/api/offers/42/?token=secret',
      request: {
        url: 'https://api.example.com/api/offers/42/?token=secret',
        query_string: 'token=secret',
        cookies: { sessionid: 'secret' },
        data: { password: 'secret' },
        headers: {
          Authorization: 'Bearer secret',
          'X-CSRFToken': 'secret',
          'User-Agent': 'jest',
        },
      },
      spans: [
        {
          op: 'http.client',
          description: 'POST https://api.example.com/api/messages/99/?q=secret',
        },
      ],
    });

    expect(event.transaction).toBe('/api/offers/:id/');
    expect(event.request?.url).toBe('/api/offers/:id/');
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.headers?.Authorization).toBeUndefined();
    expect(event.request?.headers?.['X-CSRFToken']).toBeUndefined();
    expect(event.request?.headers?.['User-Agent']).toBe('jest');
    expect(event.spans?.[0]?.description).toBe('/api/messages/:id/');
  });
});

