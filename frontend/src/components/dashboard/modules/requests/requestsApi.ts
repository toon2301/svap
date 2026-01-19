import { api, endpoints } from '@/lib/api';
import type { SkillRequestsResponse } from './types';

export async function fetchSkillRequests(): Promise<SkillRequestsResponse> {
  const res = await api.get(endpoints.requests.list);
  const data = res?.data;

  return {
    received: Array.isArray(data?.received) ? data.received : [],
    sent: Array.isArray(data?.sent) ? data.sent : [],
  };
}

export async function createSkillRequest(offerId: number) {
  return api.post(endpoints.requests.list, { offer_id: offerId });
}

export async function updateSkillRequest(requestId: number, action: 'accept' | 'reject' | 'cancel') {
  return api.patch(endpoints.requests.detail(requestId), { action });
}


