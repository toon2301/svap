import { MAX_ITEM_CHARS, MAX_PRO_CON_ITEMS, withPendingItem } from '../addReviewModalShared';

/**
 * `withPendingItem` (nález 327): pridá nepotvrdený text zo vstupu na koniec zoznamu plusov alebo mínusov pri uložení
 * formulára recenzie. Pravidlá sú rovnaké ako pri pridaní klávesom Enter alebo tlačidlom: oriezaný text, najviac 120
 * znakov, prázdny sa nepridá a zoznam nikdy nepresiahne 10 položiek.
 */
describe('withPendingItem', () => {
  it('pridá oriezaný text na koniec nového zoznamu a pôvodný zoznam nezmení', () => {
    const items = ['Prvý'];

    const result = withPendingItem(items, '  Druhý  ');

    expect(result).toEqual(['Prvý', 'Druhý']);
    expect(items).toEqual(['Prvý']);
    expect(result).not.toBe(items);
  });

  it('prázdny text a text len z medzier nepridá a vráti ten istý zoznam', () => {
    const items = ['Prvý'];

    expect(withPendingItem(items, '')).toBe(items);
    expect(withPendingItem(items, '   \t ')).toBe(items);
  });

  it('text dlhší ako 120 znakov skráti', () => {
    const result = withPendingItem([], 'a'.repeat(MAX_ITEM_CHARS + 30));

    expect(result).toEqual(['a'.repeat(MAX_ITEM_CHARS)]);
  });

  it('pri desiatich položkách nepridá nič a vráti ten istý zoznam', () => {
    const items = Array.from({ length: MAX_PRO_CON_ITEMS }, (_, i) => `Položka ${i + 1}`);

    expect(withPendingItem(items, 'Jedenásta')).toBe(items);
  });

  it('pri deviatich položkách pridá desiatu', () => {
    const items = Array.from({ length: MAX_PRO_CON_ITEMS - 1 }, (_, i) => `Položka ${i + 1}`);

    const result = withPendingItem(items, 'Desiata');

    expect(result).toHaveLength(MAX_PRO_CON_ITEMS);
    expect(result[MAX_PRO_CON_ITEMS - 1]).toBe('Desiata');
  });
});
