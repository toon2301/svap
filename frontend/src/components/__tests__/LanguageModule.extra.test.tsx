import { render, screen, fireEvent } from '@testing-library/react';
import LanguageModule from '../dashboard/modules/LanguageModule';

const setLocaleMock = jest.fn();

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    setLocale: setLocaleMock,
    t: (k: string, d: string) => {
      if (k === 'language.german') return 'Nemčina';
      if (k === 'language.english') return 'Angličtina';
      if (k === 'language.slovak') return 'Slovenčina';
      if (k === 'language.czech') return 'Čeština';
      if (k === 'language.polish') return 'Poľština';
      if (k === 'language.hungarian') return 'Maďarčina';
      if (k === 'language.title') return 'Jazyk';
      if (k === 'language.languageSelection') return 'Výber jazyka';
      if (k === 'language.selectLanguage') return 'Zvoľte si jazyk';
      return d;
    },
  }),
}));

describe('LanguageModule extra', () => {
  beforeEach(() => setLocaleMock.mockClear());

  const clickRow = (label: string) => {
    const node = screen.getAllByText(label)[0];
    const row = node.closest('div') || node.closest('button');
    const btn = (row?.querySelector('button') as HTMLButtonElement) || (row as HTMLButtonElement);
    fireEvent.click(btn);
  };

  it('switches to all supported languages', () => {
    render(<LanguageModule />);

    clickRow('Angličtina');
    clickRow('Poľština');
    clickRow('Čeština');
    clickRow('Nemčina');
    clickRow('Maďarčina');
    clickRow('Slovenčina');

    expect(setLocaleMock).toHaveBeenCalledWith('en');
    expect(setLocaleMock).toHaveBeenCalledWith('pl');
    expect(setLocaleMock).toHaveBeenCalledWith('cs');
    expect(setLocaleMock).toHaveBeenCalledWith('de');
    expect(setLocaleMock).toHaveBeenCalledWith('hu');
    expect(setLocaleMock).toHaveBeenCalledWith('sk');
  });
});


