import { api, endpoints } from '@/lib/api';
import type { DesktopOnboardingState } from '@/types';
import { normalizeDesktopOnboardingState } from './desktopOnboardingStorage';

export async function updateDesktopOnboardingState(
  state: DesktopOnboardingState,
): Promise<DesktopOnboardingState> {
  const response = await api.patch(endpoints.auth.desktopOnboarding, {
    status: state.status,
    step: state.step,
  });

  return normalizeDesktopOnboardingState(response.data);
}
