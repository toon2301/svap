import { api, endpoints } from '@/lib/api';
import type { SkillRequestTerminationReason, SkillRequestsResponse } from './types';

export type SkillRequestCreatePayload = {
  offer_id: number;
  proposed_offer_id?: number | null;
  proposal_description?: string;
  proposal_price_from?: number | null;
  proposal_price_currency?: string;
  proposal_price_negotiable?: boolean;
  proposal_experience_value?: number | null;
  proposal_experience_unit?: 'years' | 'months' | '';
};

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

export async function createSkillRequest(payload: number | SkillRequestCreatePayload) {
  const body = typeof payload === 'number' ? { offer_id: payload } : payload;
  return api.post(endpoints.requests.list, body);
}

export async function updateSkillRequest(requestId: number, action: 'accept' | 'reject' | 'cancel' | 'hide') {
  const id = toPositiveInt(requestId);
  if (!id) throw new Error('Neplatné ID žiadosti');
  const body = { action };
  return api.patch(endpoints.requests.detail(id), body, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function requestCompletion(requestId: number) {
  const id = toPositiveInt(requestId);
  if (!id) throw new Error('Neplatné ID žiadosti');
  return api.post(endpoints.requests.requestCompletion(id), {}, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function confirmCompletion(requestId: number) {
  const id = toPositiveInt(requestId);
  if (!id) throw new Error('Neplatné ID žiadosti');
  return api.post(endpoints.requests.confirmCompletion(id), {}, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function terminateSkillRequest(
  requestId: number,
  payload: { reason: SkillRequestTerminationReason; description?: string },
) {
  const id = toPositiveInt(requestId);
  if (!id) throw new Error('Neplatné ID žiadosti');
  return api.post(
    endpoints.requests.terminate(id),
    {
      reason: payload.reason,
      description: (payload.description || '').trim(),
    },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
}


