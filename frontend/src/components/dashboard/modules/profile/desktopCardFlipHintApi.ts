import { api, endpoints } from '@/lib/api';
import type { DesktopCardFlipHintState } from '@/types';

export type DesktopCardFlipHintContext = 'own' | 'foreign';

export async function completeDesktopCardFlipHint(
  context: DesktopCardFlipHintContext,
): Promise<DesktopCardFlipHintState> {
  const { data } = await api.patch<DesktopCardFlipHintState>(
    endpoints.auth.desktopCardFlipHint,
    { context },
  );
  return data;
}
