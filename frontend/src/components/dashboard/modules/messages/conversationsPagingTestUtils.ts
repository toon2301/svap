/**
 * Pomocník pre testy zoznamu konverzácií.
 *
 * Zoznam sa načítava cez `listConversationsPage` (stránkované API). Staršie testy nastavujú
 * odpoveď cez `listConversations` / `listMessageRequests` (pole konverzácií); tento adaptér ich
 * prekladá na jednu stránku bez ďalších, takže ich asercie ostávajú v platnosti.
 */

import type { ConversationsPage, ConversationsTab } from './conversationsPagingApi';
import type { ConversationListItem } from './types';

type LegacyList = (params: { search?: string }) => Promise<ConversationListItem[]> | undefined;

export function legacyListAsPages(
  listConversations: LegacyList,
  listMessageRequests?: LegacyList,
) {
  return async ({
    tab,
    search,
  }: {
    tab: ConversationsTab;
    search: string;
  }): Promise<ConversationsPage> => {
    const source = tab === 'requests' ? listMessageRequests : listConversations;
    const items = source ? await source({ search }) : [];
    return { items: Array.isArray(items) ? items : [], hasMore: false };
  };
}
