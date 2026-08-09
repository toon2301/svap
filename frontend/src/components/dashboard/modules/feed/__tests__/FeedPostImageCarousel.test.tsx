/**
 * Galéria fotiek príspevku: jedna fotka bez ovládania, 2–5 s karuselom.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostImageCarousel from '../FeedPostImageCarousel';
import type { FeedPostImage } from '@/lib/feedApi';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

function approved(id: number): FeedPostImage {
  return {
    id,
    thumbnail_url: `https://cdn.test/${id}-thumb.webp`,
    large_url: `https://cdn.test/${id}-large.webp`,
    width: 800,
    height: 600,
  };
}

function currentSrc() {
  return screen.getByTestId('feed-post-image').querySelector('img')?.getAttribute('src');
}

describe('FeedPostImageCarousel', () => {
  it('renders nothing without images', () => {
    const { container } = render(
      <FeedPostImageCarousel images={[]} alt="Fotka" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a single photo without any controls', () => {
    render(<FeedPostImageCarousel images={[approved(1)]} alt="Fotka" />);

    expect(screen.getByTestId('feed-post-image')).toBeInTheDocument();
    // Jedna fotka sa správa presne ako pred Fázou 4.4.
    expect(screen.queryByTestId('feed-image-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-image-dots')).not.toBeInTheDocument();
  });

  it('moves between photos with the arrow buttons', async () => {
    render(
      <FeedPostImageCarousel
        images={[approved(1), approved(2), approved(3)]}
        alt="Fotka"
      />,
    );

    expect(currentSrc()).toContain('1-large');
    await userEvent.click(screen.getByTestId('feed-image-next'));
    expect(currentSrc()).toContain('2-large');
    await userEvent.click(screen.getByTestId('feed-image-prev'));
    expect(currentSrc()).toContain('1-large');
  });

  it('wraps around at both ends', async () => {
    render(
      <FeedPostImageCarousel images={[approved(1), approved(2)]} alt="Fotka" />,
    );

    // Doľava z prvej → posledná.
    await userEvent.click(screen.getByTestId('feed-image-prev'));
    expect(currentSrc()).toContain('2-large');
    await userEvent.click(screen.getByTestId('feed-image-next'));
    expect(currentSrc()).toContain('1-large');
  });

  it('responds to the keyboard arrows', async () => {
    render(
      <FeedPostImageCarousel images={[approved(1), approved(2)]} alt="Fotka" />,
    );

    const carousel = screen.getByTestId('feed-post-image');
    carousel.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(currentSrc()).toContain('2-large');
    await userEvent.keyboard('{ArrowLeft}');
    expect(currentSrc()).toContain('1-large');
  });

  it('jumps straight to a photo from the dots', async () => {
    render(
      <FeedPostImageCarousel
        images={[approved(1), approved(2), approved(3)]}
        alt="Fotka"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Zobraziť fotku 3' }));

    expect(currentSrc()).toContain('3-large');
    expect(screen.getByTestId('feed-post-image')).toHaveTextContent('3/3');
  });

  it('shows the processing state for a photo the author has not had approved', () => {
    render(
      <FeedPostImageCarousel
        images={[{ id: 9, status: 'pending' }]}
        alt="Fotka"
      />,
    );

    expect(screen.getByTestId('feed-image-status')).toHaveTextContent('Spracúva sa…');
  });

  it('shows the rejection reason to the author', () => {
    render(
      <FeedPostImageCarousel
        images={[{ id: 9, status: 'rejected', rejected_reason: 'Nevhodný obsah.' }]}
        alt="Fotka"
      />,
    );

    const status = screen.getByTestId('feed-image-status');
    expect(status).toHaveTextContent('Fotka zamietnutá');
    expect(status).toHaveTextContent('Nevhodný obsah.');
  });

  it('recovers when the photo list shrinks under the active index', async () => {
    const { rerender } = render(
      <FeedPostImageCarousel
        images={[approved(1), approved(2), approved(3)]}
        alt="Fotka"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zobraziť fotku 3' }));

    // Obnovenie feedu môže fotky odobrať – index mimo rozsahu by nevykreslil nič.
    rerender(<FeedPostImageCarousel images={[approved(1)]} alt="Fotka" />);

    expect(currentSrc()).toContain('1-large');
  });
});
