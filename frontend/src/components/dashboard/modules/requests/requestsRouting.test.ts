import { describe, expect, it } from '@jest/globals';
import {
  parseRequestsSearchParams,
  parseRequestsTargetUrl,
} from './requestsRouting';

describe('requestsRouting', () => {
  it('parses active sent requests target URLs', () => {
    expect(
      parseRequestsTargetUrl('/dashboard/requests?status=active&tab=sent'),
    ).toEqual({
      statusTab: 'active',
      tab: 'sent',
    });
  });

  it('falls back safely for invalid request tab params', () => {
    const params = new URLSearchParams('status=unknown&tab=other');

    expect(parseRequestsSearchParams(params)).toEqual({
      statusTab: 'pending',
      tab: 'received',
    });
  });

  it('accepts a trailing slash in requests target URLs', () => {
    expect(parseRequestsTargetUrl('/dashboard/requests/?status=completed')).toEqual({
      statusTab: 'completed',
      tab: 'received',
    });
  });

  it('ignores non-requests target URLs', () => {
    expect(parseRequestsTargetUrl('/dashboard/messages')).toBeNull();
  });

  it('ignores external target URLs even when the path matches requests', () => {
    expect(
      parseRequestsTargetUrl('https://example.com/dashboard/requests?status=active&tab=sent'),
    ).toBeNull();
  });
});
