/**
 * Blok fotky v mobilnom detaile príspevku sa nesmie dať posúvať vodorovne (nález 369).
 *
 * Detail vkladá celý obsah nad komentármi do posuvného boxu so zoznamom, ktorý má vpravo odsadenie `pr-1`. Blok fotky mal
 * záporný okraj `-mx-4`, takže bol o 12 px širší než box a ten sa dal posúvať zo strany na stranu (pri každej šírke okna).
 * Teraz má blok len `-mr-1`, ktoré ruší práve toto odsadenie: sedí presne v boxe. Viditeľná šírka fotky ostala rovnaká.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy; presah sa merali v Chromiu (0 px pri šírkach 360, 390 a 430 px).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostMobileDetailContent from '../FeedPostMobileDetailContent';
import type { FeedPost, FeedPostImage } from '@/lib/feedApi';

jest.mock('../FeedPostImageCarousel', () => ({
  __esModule: true,
  default: () => <div data-testid="karusel-fotiek" />,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

const fotka = {
  id: 11,
  status: 'approved',
  thumbnail_url: 'http://api.test/11-t.webp',
  large_url: 'http://api.test/11-l.webp',
} as FeedPostImage;

const prispevok = {
  id: 7,
  post_type: 'free_post',
  caption: 'Text príspevku',
  shared_content: null,
} as unknown as FeedPost;

function vykresli(hasPhoto: boolean) {
  return render(
    <FeedPostMobileDetailContent
      caption="Text príspevku"
      hasPhoto={hasPhoto}
      images={hasPhoto ? [fotka] : []}
      t={(_kluc: string, nahradny?: string) => nahradny ?? ''}
      hasSharedPreview={false}
      currentPost={prispevok}
      isSelfShare={false}
      openSharedSource={undefined}
      sharedPhotoPostId={null}
      setSharedPhotoOpen={jest.fn()}
      toggleLike={jest.fn(async () => undefined)}
      isLiked={false}
      likesCount={0}
      setLikersOpen={jest.fn()}
      commentsCount={0}
      setShareOpen={jest.fn()}
      commentsAnchorRef={{ current: null }}
      autoScrollDecision={null}
    />,
  );
}

describe('blok fotky v mobilnom detaile', () => {
  it('ruší len pravé odsadenie posuvného boxu (`-mr-1`), nie 16 px po oboch stranách', () => {
    vykresli(true);

    const blok = screen.getByTestId('feed-mobile-detail-photo');
    expect(blok).toHaveClass('-mr-1', 'pb-3');
    expect(blok).not.toHaveClass('-mx-4');
    expect(blok).not.toHaveClass('-ml-4');
    expect(blok).not.toHaveClass('-mr-4');
  });

  it('obsahuje karusel fotiek', () => {
    vykresli(true);

    expect(screen.getByTestId('feed-mobile-detail-photo')).toContainElement(
      screen.getByTestId('karusel-fotiek'),
    );
  });

  it('bez fotky sa blok nevykreslí', () => {
    vykresli(false);

    expect(screen.queryByTestId('feed-mobile-detail-photo')).toBeNull();
  });
});
