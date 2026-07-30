import api from '@/lib/api';

import type { BugReportPayload, BugReportResponse } from './types';

export async function createBugReport(
  payload: BugReportPayload,
): Promise<BugReportResponse> {
  const response = await api.post<BugReportResponse>('/auth/bug-reports/', payload);
  return response.data;
}
