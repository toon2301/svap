/**
 * Nový vstupný bod zdieľania na portfólio karte (Fáza 4.5).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PortfolioCard } from './PortfolioCard';
import type { PortfolioItem } from './portfolioTypes';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

jest.mock('../shared/BlurredContainImage', () => ({
  __esModule: true,
  default: () => <div data-testid="cover" />,
}));

const item = {
  id: 9,
  title: 'Rekonštrukcia kúpeľne',
  category: 'remeslo',
  cover_image: { thumbnail_url: 'https://cdn.test/a.webp' },
  likes_count: 0,
  is_liked_by_me: false,
} as PortfolioItem;

describe('PortfolioCard – zdieľanie na Nástenku', () => {
  it('shows no share icon when the handler is missing', () => {
    render(<PortfolioCard item={item} categoryLabel="Remeslo" />);

    expect(screen.queryByTestId('portfolio-share-button')).not.toBeInTheDocument();
  });

  it('calls the share handler with the item', async () => {
    const onShareToBoard = jest.fn();
    render(
      <PortfolioCard
        item={item}
        categoryLabel="Remeslo"
        onShareToBoard={onShareToBoard}
      />,
    );

    await userEvent.click(screen.getByTestId('portfolio-share-button'));

    expect(onShareToBoard).toHaveBeenCalledWith(item);
  });

  it('does not open the item when the share icon is clicked', async () => {
    const onClick = jest.fn();
    const onShareToBoard = jest.fn();
    render(
      <PortfolioCard
        item={item}
        categoryLabel="Remeslo"
        onClick={onClick}
        onShareToBoard={onShareToBoard}
      />,
    );

    await userEvent.click(screen.getByTestId('portfolio-share-button'));

    // Karta je klikateľná – bez stopPropagation by sa otvoril aj detail.
    expect(onShareToBoard).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
