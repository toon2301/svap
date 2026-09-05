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

    await user.click(screen.getByRole('button', { name: 'Podkategória' }));
    // Jednorazový zápis namiesto písania znak po znaku: každý znak by nad
    // celým katalógom kategórií prefiltroval zoznam nanovo a na zaťaženom CI
    // sa to nezmestilo do limitu. Tento test overuje mapovanie preloženého
    // názvu na kanonickú dvojicu, nie postupné písanie – to má vlastné
    // pokrytie v `OfferWatchSearchSelect.test.tsx`.
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: `Preklad ${SUBCATEGORY}` },
    });
    const translatedLabel = await screen.findByText(`Preklad ${SUBCATEGORY}`);
    await user.click(translatedLabel.closest('button')!);

    expect(onChange).toHaveBeenCalledWith(CATEGORY, SUBCATEGORY);
  });
});
