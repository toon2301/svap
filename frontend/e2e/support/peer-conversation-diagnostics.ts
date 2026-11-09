import type { TestInfo } from '@playwright/test';
import { captureWithin } from './evidence-deadline';

type PeerConversationCounts = {
  firstPage: number;
  slugMatches: number;
  deletedMatches: number;
  namedMatches: number;
  nameMatches: number;
};

/** Súkromná časť ostáva iba pre pôvodné kroky testu, nikdy pre výpis. */
type PeerConversationSnapshot = {
  peer: { id: number; displayName: string; sameTitle: number } | null;
  counts: PeerConversationCounts | null;
};

/**
 * Beží priamo v page.evaluate: pôvodné jediné čítanie prvej stránky konverzácií.
 * Výber konverzácie nemení; vedľa výsledku spočíta iba diagnostické počty.
 */
export async function readPeerConversationInBrowser(slug: string): Promise<PeerConversationSnapshot> {
  type Item = {
    id?: number;
    is_group?: boolean;
    name?: string | null;
    other_user?: { slug?: string | null; display_name?: string; is_deleted?: boolean } | null;
  };
  const response = await fetch('/api/auth/messaging/conversations/', { credentials: 'include' });
  if (!response.ok) throw new Error(`Príprava: zoznam konverzácií vrátil HTTP ${response.status}.`);
  const data = await response.json().catch(() => null);
  const items: Item[] = Array.isArray(data) ? data : (data?.results ?? []);

  const match = items.find(
    (item) => !item.is_group && !item.other_user?.is_deleted && item.other_user?.slug === slug,
  );
  const displayName = (match?.other_user?.display_name ?? '').trim();
  const validPeer = match && typeof match.id === 'number' && displayName
    ? { id: match.id, displayName }
    : null;
  const sameTitle = validPeer ? items.filter((item) =>
    item.is_group
      ? (item.name ?? '').trim() === displayName
      : !item.other_user?.is_deleted && (item.other_user?.display_name ?? '').trim() === displayName,
  ).length : 0;

  const peer = validPeer ? { ...validPeer, sameTitle } : null;
  let counts: PeerConversationCounts | null = null;
  try {
    const slugMatches = items.filter((item) => !item.is_group && item.other_user?.slug === slug);
    counts = {
      firstPage: items.length,
      slugMatches: slugMatches.length,
      deletedMatches: slugMatches.filter((item) => Boolean(item.other_user?.is_deleted)).length,
      namedMatches: slugMatches.filter((item) =>
        !item.other_user?.is_deleted && Boolean((item.other_user?.display_name ?? '').trim()),
      ).length,
      nameMatches: sameTitle,
    };
  } catch {
    // Dodatočná diagnostika nesmie nahradiť výsledok pôvodného výberu.
  }
  return { peer, counts };
}

/** Výstup má pevné kľúče a iba celé počty; nadbytočné polia sa nikdy nečítajú. */
export function formatPeerConversationCounts(value: unknown): string {
  const unavailable = '[E2E-PEER] counts=unavailable';
  if (!value || typeof value !== 'object' || Array.isArray(value)) return unavailable;
  const record = value as Record<string, unknown>;
  const keys = ['firstPage', 'slugMatches', 'deletedMatches', 'namedMatches', 'nameMatches'] as const;
  const counts = keys.map((key) => record[key]);
  if (!counts.every((count) => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0)) {
    return unavailable;
  }
  return `[E2E-PEER] ${keys.map((key, index) => `${key}=${counts[index]}`).join(' ')}`;
}

/** Priloží len bezpečný formát; chyba diagnostiky nesmie nahradiť pôvodný pád. */
export async function reportPeerConversationCounts(value: unknown, testInfo: Pick<TestInfo, 'attach'>): Promise<void> {
  await captureWithin(async () => {
    const evidence = formatPeerConversationCounts(value);
    console.log(evidence);
    await testInfo.attach('peer-conversation-counts', { body: evidence, contentType: 'text/plain' });
  }, 1000);
}
