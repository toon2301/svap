import { api, endpoints } from '@/lib/api';
import type { SkillRequestsResponse } from './types';

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 1) return null;
  return i;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as any;
  return (
    (typeof e?.response?.data?.error === 'string' && e.response.data.error) ||
    (typeof e?.response?.data?.detail === 'string' && e.response.data.detail) ||
    (typeof e?.message === 'string' && e.message) ||
    fallback
  );
}

export async function fetchSkillRequests(statusQuery?: string): Promise<SkillRequestsResponse> {
  const url = statusQuery
    ? `${endpoints.requests.list}?status=${encodeURIComponent(statusQuery)}`
    : endpoints.requests.list;
  const res = await api.get(url);
  const data = res?.data;

  return {
    received: Array.isArray(data?.received) ? data.received : [],
    sent: Array.isArray(data?.sent) ? data.sent : [],
  };
}

export async function createSkillRequest(offerId: number) {
  return api.post(endpoints.requests.list, { offer_id: offerId });
}

export async function updateSkillRequest(requestId: number, action: 'accept' | 'reject' | 'cancel' | 'hide') {
  const id = toPositiveInt(requestId);
  if (!id) throw new Error('Neplatné ID žiadosti');
  const body = { action };
  return api.patch(endpoints.requests.detail(id), body, {
    headers: { 'Content-Type': 'application/json' },
  });
}


