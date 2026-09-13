import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { skillsCategories } from '@/constants/skillsCategories';
import OfferWatchCategoryField from './OfferWatchCategoryField';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => (
      key.startsWith('skillsCatalog.subcategories.')
        ? `Preklad ${fallback}`
        : fallback || key
    ),
  }),
}));

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;
const SUBCATEGORY = SUBCATEGORIES[0]!;

describe('OfferWatchCategoryField', () => {
  it('keeps every canonical category and subcategory pair unique', () => {
    const optionKeys = Object.entries(skillsCategories).flatMap(
      ([category, subcategories]) => subcategories.map(
        (subcategory) => `${category}\u0000${subcategory}`,
      ),
    );

    expect(new Set(optionKeys).size).toBe(optionKeys.length);
  });

  it('finds a localized label but returns the canonical category pair', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <OfferWatchCategoryField
        id='watch-category'
        category=''
        subcategory=''
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Podkategória' }));
    // Jednorazový zápis namiesto písania znak po znaku: každý znak by nad
    // celým katalógom kategórií prefiltroval zoznam nanovo a na zaťaženom CI
    // sa to nezmestilo do limitu. Tento test overuje mapovanie preloženého
    // názvu na kanonickú dvojicu, nie postupné písanie – to má vlastné
    // pokrytie v `OfferWatchSearchSelect.test.tsx`.
    fireEvent.change(screen.getByRole('combobox', { name: 'Podkategória' }), {
      target: { value: `Preklad ${SUBCATEGORY}` },
    });
    const translatedLabel = await screen.findByText(`Preklad ${SUBCATEGORY}`);
    await user.click(translatedLabel.closest('button')!);

    expect(onChange).toHaveBeenCalledWith(CATEGORY, SUBCATEGORY);
  });

  it('does not retain a real catalog result after a query with no matches', () => {
    render(
      <OfferWatchCategoryField
        id='watch-category'
        category=''
        subcategory=''
        onChange={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Podkategória' });
    fireEvent.focus(combobox);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      fireEvent.change(combobox, { target: { value: 'Technická dokumentácia' } });
      expect(screen.getAllByText('Preklad Technická dokumentácia')).toHaveLength(1);

      fireEvent.change(combobox, { target: { value: 'xyzabc123' } });
      expect(screen.queryAllByRole('option')).toHaveLength(0);
      expect(screen.getByRole('status')).toHaveTextContent('Nenašla sa žiadna podkategória.');
      expect(screen.queryByText('Preklad Technická dokumentácia')).not.toBeInTheDocument();
    }
  });
});
