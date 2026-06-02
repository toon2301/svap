import { api, endpoints } from '@/lib/api';
import type { MobileOnboardingState } from '@/types';
import { normalizeMobileOnboardingState } from './mobileOnboardingStorage';

export async function updateMobileOnboardingState(
  state: MobileOnboardingState,
): Promise<MobileOnboardingState> {
  const response = await api.patch(endpoints.auth.mobileOnboarding, {
    status: state.status,
    step: state.step,
  });

  return normalizeMobileOnboardingState(response.data);
}
