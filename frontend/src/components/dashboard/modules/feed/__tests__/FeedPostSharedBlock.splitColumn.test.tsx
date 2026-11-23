/**
 * Zdieľaný blok v okne detailu: pružná plocha karty len v ľavom stĺpci dvojstĺpcového okna (nález 344, R68).
 *
 * Ľavý stĺpec má pevnú výšku, jednostĺpcové okno len strop, a tam by pružná plocha nemala z čoho rátať. Údaj, že
 * blok stojí v ľavom stĺpci, nesie `FeedDetailSplitContext` (karta `FeedPostCard.tsx` nesmie rásť nad 500 riadkov).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostSharedBlock from '../FeedPostSharedBlock';
import { FeedDetailSplitProvider, useFeedDetailSplit } from '../FeedDetailSplitContext';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const PONUKA = {
  id: 7,
  post_type: 'shared_offer',
  caption: 'Odporúčam.',
  author: autor,
  images: [],
  shared_content: {
    type: 'offer',
    title: 'Programovanie',
    category: 'it',
    caption: '',
    id: 42,
    owner: { ...autor, id: 30, display_name: 'Peter', slug: 'peter' },
    owner_display_name: 'Peter',
    thumbnail_url: null,
    is_seeking: false,
    price_negotiable: false,
    price_from: '25',
    price_currency: '€',
  },
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 0,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
} as unknown as FeedPost;

function blok(fillHeight: boolean, vStlpci: boolean) {
  const obsah = (
    <FeedPostSharedBlock
      fillHeight={fillHeight}
      fixedBlock={fillHeight ? 'shrink-0' : ''}
      isShared
      isDetail
      caption="Odporúčam."
      opensMobileDetail={false}
      setMobileDetailOpen={jest.fn()}
      post={PONUKA}
      isSelfShare={false}
      handleOpenSharedSource={undefined}
      handleOpenSharedPostPreview={undefined}
      sharedPhotoPostId={null}
      setSharedPhotoOpen={jest.fn()}
      taggedUsers={[]}
      setTagRemoveOpen={jest.fn()}
      t={(_kluc: string, nahradny?: string) => nahradny ?? ''}
    />
  );
  return render(vStlpci ? <FeedDetailSplitProvider value>{obsah}</FeedDetailSplitProvider> : obsah);
}

function riadok(): HTMLElement {
  return screen.getByTestId('feed-shared-card').parentElement as HTMLElement;
}

describe('zdieľaný blok a ľavý stĺpec dvojstĺpcového okna', () => {
  it('v ľavom stĺpci je blok flex stĺpec a plocha karty je pružná', () => {
    blok(true, true);

    // `toHaveClass` porovnáva celé triedy: chýbajúca medzera pred `flex` (`overflow-y-autoflex`) by prešla cez `toContain`.
    expect(riadok()).toHaveClass('flex', 'flex-col', 'overflow-y-auto');
    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
  });

  it('v jednostĺpcovom okne (bez ľavého stĺpca) ostáva blok ako predtým a plocha 256 px', () => {
    blok(true, false);

    expect(riadok().className).toContain('overflow-y-auto');
    expect(riadok().className).not.toContain('flex-col');
    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('min-h-32');
  });

  it('karta vo feede (bez fillHeight) sa kontextom nemení', () => {
    blok(false, true);

    expect(riadok().className).not.toContain('overflow-y-auto');
    expect(riadok().className).not.toContain('flex-col');
    expect(screen.getByTestId('feed-shared-card-media').className).toContain('h-64');
  });
});

describe('údaj o ľavom stĺpci (useFeedDetailSplit)', () => {
  function Sonda() {
    return <span data-testid="sonda">{String(useFeedDetailSplit())}</span>;
  }

  it('bez poskytovateľa vráti false', () => {
    render(<Sonda />);

    expect(screen.getByTestId('sonda')).toHaveTextContent('false');
  });

  it('vnútri poskytovateľa vráti true', () => {
    render(
      <FeedDetailSplitProvider value>
        <Sonda />
      </FeedDetailSplitProvider>,
    );

    expect(screen.getByTestId('sonda')).toHaveTextContent('true');
  });
});
