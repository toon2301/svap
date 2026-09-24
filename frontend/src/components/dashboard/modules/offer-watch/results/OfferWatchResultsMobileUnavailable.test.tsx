import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import OfferWatchResultsMobileUnavailable from './OfferWatchResultsMobileUnavailable';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

describe('OfferWatchResultsMobileUnavailable', () => {
  it('explains the mobile limitation and opens watch management', () => {
    const onManage = jest.fn();

    render(<OfferWatchResultsMobileUnavailable onManage={onManage} />);

    expect(
      screen.getByRole('heading', { name: 'Výsledky na mobile pripravujeme' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Výsledky sledovaní sú zatiaľ dostupné vo verzii pre počítač/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Spravovať sledovania' }));
    expect(onManage).toHaveBeenCalledTimes(1);
  });
});
