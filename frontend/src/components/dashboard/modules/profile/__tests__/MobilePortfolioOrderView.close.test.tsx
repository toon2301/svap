import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const reorderPortfolioItems = jest.fn();
jest.mock('../portfolioApi', () => ({
  reorderPortfolioItems: (...args: unknown[]) => reorderPortfolioItems(...args),
}));

import { MobilePortfolioOrderView } from '../MobilePortfolioOrderView';
import type { PortfolioItem } from '../portfolioTypes';

const ITEMS = [
  { id: 1, title: 'Prvý' },
  { id: 2, title: 'Druhý' },
] as unknown as PortfolioItem[];

describe('MobilePortfolioOrderView – close (BOD 4)', () => {
  beforeEach(() => reorderPortfolioItems.mockReset());

  it('renders as a modal dialog', () => {
    render(<MobilePortfolioOrderView items={ITEMS} onSaved={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('Escape closes without saving (onSaved with original order, no reorder API)', () => {
    const onSaved = jest.fn();
    render(<MobilePortfolioOrderView items={ITEMS} onSaved={onSaved} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(ITEMS);
    expect(reorderPortfolioItems).not.toHaveBeenCalled();
  });

  it('close button closes without saving', () => {
    const onSaved = jest.fn();
    render(<MobilePortfolioOrderView items={ITEMS} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: 'Zavrieť' }));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(ITEMS);
    expect(reorderPortfolioItems).not.toHaveBeenCalled();
  });
});
