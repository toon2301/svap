/** Zdieľané konštanty a typy pre modal Pridať/Upraviť recenziu (desktop + mobil) */

export const MAX_CHARS = 300;
export const MAX_PRO_CON_ITEMS = 10;
export const MAX_ITEM_CHARS = 120;
/** Výška oblasti zoznamu plusov/minusov – max 2 riadky, potom scroll */
export const PRO_CON_LIST_MAX_HEIGHT = '6.1rem';

export type AddReviewModalProps = {
  open: boolean;
  onClose: () => void;
  reviewerName: string;
  reviewerAvatarUrl?: string | null;
  reviewToEdit?: {
    id: number;
    rating: number;
    text: string;
    pros: string[];
    cons: string[];
  } | null;
  onSubmit?: (rating: number, text: string, pros: string[], cons: string[]) => void;
};

export function getInitials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}
