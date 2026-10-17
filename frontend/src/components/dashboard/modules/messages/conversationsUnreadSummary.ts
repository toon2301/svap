import {
  getMessageUnreadCountStore,
  publishMessageUnreadCount,
} from '@/components/dashboard/contexts/messageUnreadStore';
import { getUnreadMessagesSummary } from './messagingApi';

/**
 * Celkový počet neprečítaných správ (odznak v navigácii) zo servera.
 *
 * Zoznam konverzácií je stránkovaný, takže súčet z načítaných položiek by počet podcenil.
 * Zdrojom pravdy je súhrn zo servera. `snapshotAt` je čas začiatku obnovy zoznamu: výsledok
 * sa zahodí, ak medzitým prišiel novší autoritatívny údaj (prečítanie, WS), inak by ho
 * starší súhrn prepísal späť. Chyba nič nerozbije – odznak dostáva aj udalosti v reálnom čase.
 */
export async function refreshMessageUnreadCountFromServer(snapshotAt: number): Promise<void> {
  try {
    const summary = await getUnreadMessagesSummary();
    if (getMessageUnreadCountStore().lastSuccessfulRefreshAt > snapshotAt) return;
    publishMessageUnreadCount(summary.count);
  } catch {
    // Odznak je len pomôcka, zoznam konverzácií sa nesmie pre ňu pokaziť.
  }
}
