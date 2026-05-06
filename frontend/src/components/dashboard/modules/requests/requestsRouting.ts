export type RequestsTab = 'received' | 'sent';
export type RequestsStatusTab = 'pending' | 'active' | 'completed' | 'cancelled';

export interface RequestsRouteSelection {
  statusTab: RequestsStatusTab;
  tab: RequestsTab;
}

export interface RequestsRouteIntent extends RequestsRouteSelection {
  key: number;
}

export const STATUS_PARAMS: Record<RequestsStatusTab, string> = {
  pending: 'pending',
  active: 'accepted,completion_requested',
  completed: 'completed',
  cancelled: 'cancelled,rejected',
};

export function parseRequestsStatusTab(value: string | null): RequestsStatusTab {
  if (value === 'active' || value === 'completed' || value === 'cancelled') return value;
  return 'pending';
}

export function parseRequestsTab(value: string | null): RequestsTab {
  return value === 'sent' ? 'sent' : 'received';
}

export function parseRequestsSearchParams(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): RequestsRouteSelection {
  return {
    statusTab: parseRequestsStatusTab(searchParams?.get('status') ?? null),
    tab: parseRequestsTab(searchParams?.get('tab') ?? null),
  };
}

export function parseRequestsTargetUrl(targetUrl: string): RequestsRouteSelection | null {
  const isRequestsTarget =
    targetUrl === '/dashboard/requests' ||
    targetUrl.startsWith('/dashboard/requests?') ||
    targetUrl.startsWith('/dashboard/requests/') ||
    targetUrl.startsWith('/dashboard/requests#');

  if (!isRequestsTarget) return null;

  try {
    const parsed = new URL(targetUrl, 'https://swaply.local');
    if (parsed.pathname !== '/dashboard/requests' && parsed.pathname !== '/dashboard/requests/') {
      return null;
    }
    return parseRequestsSearchParams(parsed.searchParams);
  } catch {
    return null;
  }
}
