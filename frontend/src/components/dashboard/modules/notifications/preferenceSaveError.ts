import toast from 'react-hot-toast';

/** Jedna zdieľaná karta pre chyby ukladania volieb, aby sa opakované zlyhania (napr. viac ťuknutí bez internetu) nezoradili pod seba. */
export const SAVE_ERROR_TOAST_ID = 'notification-preferences-save-error';

/**
 * Ukáže chybu uloženia voľby upozornení (aj pri vypnutom internete) ako toast, nie ako blok v stránke, ktorý by posunul
 * obsah (nález 308). Používajú ho kategórie aj hlavný vypínač ako `onError` pri `updatePreference`.
 */
export function showPreferenceSaveError(message: string): void {
  toast.error(message, { id: SAVE_ERROR_TOAST_ID });
}
