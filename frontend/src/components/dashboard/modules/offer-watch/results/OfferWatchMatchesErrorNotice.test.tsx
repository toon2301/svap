import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OfferWatchMatchesErrorNotice from './OfferWatchMatchesErrorNotice';

const translate = jest.fn((key: string, fallback?: string) => fallback || key);
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => translate(key, fallback) }),
}));

describe('OfferWatchMatchesErrorNotice', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([true, false])('keeps the existing light/dark severity styles (preserved cards: %s)', (hasMatches) => {
    render(<OfferWatchMatchesErrorNotice hasMatches={hasMatches} disabled={false} onRetry={jest.fn()} className='mt-5' />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('mt-5', 'rounded-2xl', 'border');
    expect(alert).toHaveClass(hasMatches ? 'border-amber-200' : 'border-red-200');
    expect(alert).toHaveClass(hasMatches ? 'dark:bg-amber-950/20' : 'dark:bg-red-950/20');
    expect(screen.getByText('Výsledky sa nepodarilo načítať.')).toHaveClass(
      hasMatches ? 'dark:text-amber-200' : 'dark:text-red-200',
    );
    expect(translate).toHaveBeenCalledWith('offerWatchResults.matchesLoadFailed', 'Výsledky sa nepodarilo načítať.');
    expect(translate).toHaveBeenCalledWith('offerWatch.retry', 'Skúsiť znova');
    expect(screen.getByRole('button', { name: 'Skúsiť znova' }).querySelector('svg'))
      .toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps retry keyboard accessible and does not submit an enclosing form', async () => {
    const retry = jest.fn();
    const submit = jest.fn((event) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={submit}>
        <OfferWatchMatchesErrorNotice hasMatches disabled={false} onRetry={retry} className='mb-5' />
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Skúsiť znova' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('focus:ring-2', 'focus:ring-purple-500/35');
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(retry).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it('prevents duplicate retry clicks while disabled', () => {
    const retry = jest.fn();
    render(<OfferWatchMatchesErrorNotice hasMatches disabled onRetry={retry} className='mt-5' />);
    const button = screen.getByRole('button', { name: 'Skúsiť znova' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });
});
