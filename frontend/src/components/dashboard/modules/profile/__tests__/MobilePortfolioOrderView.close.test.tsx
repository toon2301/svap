import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const reorderPortfolioItems = jest.fn();
jest.mock('../portfolioApi', () => ({
  reorderPortfolioItems: (...args: unknown[]) => reorderPortfolioItems(...args),
}));

import toast from 'react-hot-toast';
import { MobilePortfolioOrderView } from '../MobilePortfolioOrderView';
import type { PortfolioItem } from '../portfolioTypes';

const ITEMS = [
  { id: 1, title: 'Prvý' },
  { id: 2, title: 'Druhý' },
] as unknown as PortfolioItem[];

describe('MobilePortfolioOrderView – close (BOD 4)', () => {
  beforeEach(() => {
    reorderPortfolioItems.mockReset();
    (toast.success as jest.Mock).mockReset();
    (toast.error as jest.Mock).mockReset();
  });

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

  it('saves a changed order and shows a success toast', async () => {
    reorderPortfolioItems.mockResolvedValue([
      { id: 2, title: 'Druhý' },
      { id: 1, title: 'Prvý' },
    ]);
    render(<MobilePortfolioOrderView items={ITEMS} onSaved={jest.fn()} />);

    // Zmena poradia cez klávesnicu (ArrowDown na drag tlačidle prvej položky).
    fireEvent.keyDown(screen.getByTestId('mobile-portfolio-order-drag-1'), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: 'portfolio.saveOrder' }));

    await waitFor(() => expect(reorderPortfolioItems).toHaveBeenCalledWith([2, 1]));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('portfolio.orderSaveSuccess'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows an error toast when saving the order fails', async () => {
    reorderPortfolioItems.mockRejectedValue(new Error('fail'));
    render(<MobilePortfolioOrderView items={ITEMS} onSaved={jest.fn()} />);

    fireEvent.keyDown(screen.getByTestId('mobile-portfolio-order-drag-1'), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: 'portfolio.saveOrder' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('portfolio.orderSaveFailed'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
