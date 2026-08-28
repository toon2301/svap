/**
 * Fullscreen prehliadač fotiek príspevku.
 *
 * Obal je spoločný s portfóliom (`ImageLightbox`), tu sa overuje feedová
 * strana: čo sa otvorí, s akým indexom, čím sa zatvára a že sa do prehliadača
 * nikdy nedostane fotka, ktorú karta nezobrazuje.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostImageCarousel from '../FeedPostImageCarousel';
import type { FeedPostImage } from '@/lib/feedApi';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

// Chránené obrázky rieši axios; vo feede sú URL verejné, takže hook vracia
// zdroj priamo – v teste to zjednodušíme na identitu.
jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

function image(id: number, overrides: Partial<FeedPostImage> = {}): FeedPostImage {
  return {
    id,
    status: 'approved',
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
    ...overrides,
  } as FeedPostImage;
}

function renderCarousel(images: FeedPostImage[]) {
  return render(<FeedPostImageCarousel images={images} alt="Fotka príspevku" />);
}

function lightboxImageSrc(): string | null {
  return screen
    .getByTestId('feed-image-lightbox-image')
    .getAttribute('src');
}

it('opens the lightbox on the clicked photo', async () => {
  renderCarousel([image(11)]);

  await userEvent.click(screen.getByTestId('feed-image-open-11'));

  expect(screen.getByTestId('feed-image-lightbox')).toBeInTheDocument();
  expect(lightboxImageSrc()).toBe('http://api.test/11-l.webp');
});

it('opens at the index of the photo the user is looking at', async () => {
  renderCarousel([image(11), image(12), image(13)]);

  // Preklikni na druhú fotku na karte a otvor práve tú.
  await userEvent.click(screen.getByTestId('feed-image-next'));
  await userEvent.click(screen.getByTestId('feed-image-open-12'));

  expect(lightboxImageSrc()).toBe('http://api.test/12-l.webp');
  expect(screen.getByTestId('feed-image-lightbox-counter')).toHaveTextContent(
    '2/3',
  );
});

it('switches photos with the arrows and the keyboard', async () => {
  renderCarousel([image(11), image(12), image(13)]);
  await userEvent.click(screen.getByTestId('feed-image-open-11'));

  await userEvent.click(screen.getByTestId('feed-image-lightbox-next'));
  expect(lightboxImageSrc()).toBe('http://api.test/12-l.webp');

  await userEvent.keyboard('{ArrowRight}');
  expect(lightboxImageSrc()).toBe('http://api.test/13-l.webp');

  await userEvent.keyboard('{ArrowLeft}');
  expect(lightboxImageSrc()).toBe('http://api.test/12-l.webp');

  await userEvent.click(screen.getByTestId('feed-image-lightbox-prev'));
  expect(lightboxImageSrc()).toBe('http://api.test/11-l.webp');
});

it('closes with X and returns focus to the photo', async () => {
  renderCarousel([image(11)]);
  const trigger = screen.getByTestId('feed-image-open-11');
  await userEvent.click(trigger);

  await userEvent.click(screen.getByTestId('feed-image-lightbox-close'));

  await waitFor(() =>
    expect(screen.queryByTestId('feed-image-lightbox')).not.toBeInTheDocument(),
  );
  // Klávesnica sa vracia tam, odkiaľ sa prehliadač otvoril.
  await waitFor(() => expect(trigger).toHaveFocus());
});

it('closes with Escape', async () => {
  renderCarousel([image(11), image(12)]);
  await userEvent.click(screen.getByTestId('feed-image-open-11'));

  await userEvent.keyboard('{Escape}');

  await waitFor(() =>
    expect(screen.queryByTestId('feed-image-lightbox')).not.toBeInTheDocument(),
  );
});

it('leaves out the navigation for a single photo', async () => {
  renderCarousel([image(11)]);

  await userEvent.click(screen.getByTestId('feed-image-open-11'));

  const lightbox = screen.getByTestId('feed-image-lightbox');
  // Rovnaká striedmosť ako karusel na karte: pri jednej fotke žiadne šípky
  // ani počítadlo, len zatvorenie.
  expect(
    within(lightbox).queryByTestId('feed-image-lightbox-next'),
  ).not.toBeInTheDocument();
  expect(
    within(lightbox).queryByTestId('feed-image-lightbox-prev'),
  ).not.toBeInTheDocument();
  expect(
    within(lightbox).queryByTestId('feed-image-lightbox-counter'),
  ).not.toBeInTheDocument();
  expect(
    within(lightbox).getByTestId('feed-image-lightbox-close'),
  ).toBeInTheDocument();
});

describe('nezobraziteľné fotky', () => {
  it('never shows a rejected photo', async () => {
    renderCarousel([
      image(11),
      image(12, { status: 'rejected', rejected_reason: 'Nevhodny obsah' }),
    ]);

    // Zamietnutá nie je ani na karte – nedá sa teda ani otvoriť.
    expect(
      screen.queryByTestId('feed-image-open-12'),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    // A v prehliadači je len tá jedna zobraziteľná: žiadne prepínanie.
    expect(lightboxImageSrc()).toBe('http://api.test/11-l.webp');
    expect(
      screen.queryByTestId('feed-image-lightbox-next'),
    ).not.toBeInTheDocument();
  });

  it('cannot open a photo that is still being processed', async () => {
    renderCarousel([
      image(11, { status: 'pending', thumbnail_url: null, large_url: null }),
    ]);

    // Rozpracovaná fotka nemá URL – karta ukáže stav, otvárať nie je čo.
    expect(screen.getByTestId('feed-image-status')).toBeInTheDocument();
    expect(
      screen.queryByTestId('feed-image-open-11'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-image-lightbox')).not.toBeInTheDocument();
  });

  it('skips the processing photo when paging inside the lightbox', async () => {
    renderCarousel([
      image(11),
      image(12, { status: 'pending', thumbnail_url: null, large_url: null }),
      image(13),
    ]);

    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    // Prehliadač nesie len fotky so skutočnou URL – z prvej ide rovno na tretiu.
    expect(screen.getByTestId('feed-image-lightbox-counter')).toHaveTextContent(
      '1/2',
    );
    await userEvent.click(screen.getByTestId('feed-image-lightbox-next'));
    expect(lightboxImageSrc()).toBe('http://api.test/13-l.webp');
  });
});
