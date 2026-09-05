import { render, screen } from '@testing-library/react';
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
    await user.type(screen.getByRole('combobox'), `Preklad ${SUBCATEGORY}`);
    const translatedLabel = await screen.findByText(`Preklad ${SUBCATEGORY}`);
    await user.click(translatedLabel.closest('button')!);

    expect(onChange).toHaveBeenCalledWith(CATEGORY, SUBCATEGORY);
  });
});
