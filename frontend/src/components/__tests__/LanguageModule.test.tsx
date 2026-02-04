import { render, screen, fireEvent } from '@testing-library/react';
import LanguageModule from '../dashboard/modules/LanguageModule';

const setLocaleMock = jest.fn();
const setCountryMock = jest.fn();
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    setLocale: setLocaleMock,
    setCountry: setCountryMock,
    t: (k: string, d: string) => {
      if (k === 'language.german') return 'Nemčina';
      if (k === 'language.english') return 'Angličtina';
      if (k === 'language.slovak') return 'Slovenčina';
      if (k === 'language.czech') return 'Čeština';
      if (k === 'language.polish') return 'Poľština';
      if (k === 'language.hungarian') return 'Maďarčina';
      return d;
    },
  }),
}));

describe('LanguageModule', () => {
  beforeEach(() => setLocaleMock.mockClear());

  it('renders and toggles language to German', () => {
    render(<LanguageModule />);
    // Click the visible German row (desktop first row is Slovak; find German entry and click its adjacent control)
    const german = screen.getAllByText('Nemčina')[0];
    // The clickable element is the button next to the text; navigate to parent and query button
    const row = german.closest('div');
    // Desktop row: the circle button is inside the flex container next to label
    let btn = row?.querySelector('button');
    if (!btn) {
      // Mobile layout: entire row is a button, find inner circle by role
      const mobileRow = german.closest('button');
      btn = mobileRow || undefined as any;
    }
    fireEvent.click(btn!);
    expect(setLocaleMock).toHaveBeenCalledWith('de');
  });
});


