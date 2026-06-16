import { api, endpoints } from '@/lib/api';
import type { MobileCardFlipHintState } from '@/types';

export type MobileCardFlipHintContext = 'own' | 'foreign';

export async function completeMobileCardFlipHint(
  context: MobileCardFlipHintContext,
): Promise<MobileCardFlipHintState> {
  const { data } = await api.patch<MobileCardFlipHintState>(
    endpoints.auth.mobileCardFlipHint,
    { context },
  );
  return data;
}