import api from '@/lib/api';

import { createBugReport } from './bugReportsApi';
import type { BugReportPayload } from './types';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedPost = api.post as jest.Mock;

describe('createBugReport', () => {
  it('posts the exact payload to the authenticated bug report endpoint', async () => {
    const payload: BugReportPayload = {
      category: 'visual',
      title: 'Broken spacing',
      description: 'The card overlaps the heading.',
      reproduction_steps: 'Open the profile.',
      source_screen: 'profile',
      device_type: 'desktop',
      locale: 'sk',
      app_version: '',
      browser: 'Firefox',
    };
    const response = {
      reference: 'BR-20260730-ABC123',
      status: 'new' as const,
      created_at: '2026-07-30T10:00:00Z',
    };
    mockedPost.mockResolvedValueOnce({ data: response });

    await expect(createBugReport(payload)).resolves.toEqual(response);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith('/auth/bug-reports/', payload);
  });
});
