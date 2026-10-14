import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { writeLastManualOfferCountry } from '@/shared/offerCountryPreference';
import ProfileOfferCard from '../ProfileOfferCard';
import { ProfileOfferCardMobile } from '../ProfileOfferCardMobile';
import { ProfileOfferDetailMobileContent } from '../ProfileOfferDetailMobileContent';
import { setOfferLikeState } from '../offerLikesApi';
import type { Offer } from '../profileOffersTypes';

// The shared Jest setup supplies a Slovak-only mock; this suite must use the actual provider.
jest.unmock('@/contexts/LanguageContext');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));
jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('../../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: () => null,
}));

// These independent product expectations must not be derived from the JSON under test.
const labels = [
  ['sk', 'Páči sa mi to'],
  ['cs', 'Líbí se mi to'],
  ['en', 'Likes'],
  ['de', 'Gefällt mir'],
  ['pl', 'Lubię to'],
  ['hu', 'Tetszik'],
] as const;
type Locale = (typeof labels)[number][0];
type Surface = 'desktop' | 'mobile' | 'detail';

const fixture: Offer = {
  id: 7,
  category: 'Design',
  subcategory: 'Logo',
  description: 'Fixture headline',
  detailed_description: 'Fixture detail',
  is_seeking: false,
  likes_count: 137,
  is_liked_by_me: true,
};

type HarnessProps = {
  surface: Surface;
  offer?: Offer;
  showLikeAction?: boolean;
  onToggleLike?: (offerId: number) => void;
};

/** Exercise actual card consumers and preserve their state when the real locale changes. */
function Harness({ surface, offer = fixture, showLikeAction, onToggleLike }: HarnessProps) {
  const { t, setLocale } = useLanguage();
  const [flipped, setFlipped] = useState(false);
  return <>
    <nav aria-label="Fixture locale controls">
      {labels.map(([locale]) => <button key={locale} onClick={() => setLocale(locale)}>
        locale:{locale}
      </button>)}
    </nav>
    <section aria-label="Fixture card">
      {surface === 'desktop' ? <ProfileOfferCard
        offer={offer} accountType="personal" t={t}
        isFlipped={flipped} onToggleFlip={() => setFlipped((value) => !value)}
        showLikeAction={showLikeAction} onToggleLike={onToggleLike}
      /> : surface === 'mobile' ? <ProfileOfferCardMobile
        offer={offer} accountType="personal" isTapped={false}
        onCardClick={() => {}} onToggleLike={onToggleLike}
      /> : <ProfileOfferDetailMobileContent
        offer={offer} accountType="personal" onShowHours={() => {}}
      />}
    </section>
  </>;
}

/** Hydrate the real provider with a saved locale; a saved country avoids external IP requests. */
function renderCard(locale: Locale, props: HarnessProps) {
  localStorage.setItem('appLocale', locale);
  writeLastManualOfferCountry('SK');
  return render(<LanguageProvider><Harness {...props} /></LanguageProvider>);
}

function card() {
  return within(screen.getByRole('region', { name: 'Fixture card' }));
}

/** In jsdom both Tailwind-hidden faces exist, so identify the actual active desktop face. */
function activeDesktopSide() {
  const outer = screen.getByRole('region', { name: 'Fixture card' }).firstElementChild!;
  return within(Array.from(outer.children).find((element) => element.classList.contains('block')) as HTMLElement);
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => localStorage.clear());

describe.each(labels)('real %s Like translation (%s)', (locale, label) => {
  it.each([false, true])('retains the desktop front and back label for seeking=%s', (isSeeking) => {
    renderCard(locale, { surface: 'desktop', offer: { ...fixture, is_seeking: isSeeking } });
    const like = activeDesktopSide().getByRole('button', { name: label, exact: true });
    expect(like).toHaveAttribute('title', label);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).not.toBeDisabled();
    fireEvent.click(activeDesktopSide().getByRole('button', { name: 'Otočiť' }));
    const summary = activeDesktopSide().getByText(label, { exact: true }).parentElement!;
    expect(summary).toHaveTextContent('137');
    expect(activeDesktopSide().getByText('Fixture detail')).toBeInTheDocument();
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });

  it.each([false, true])('retains the mobile Like action for seeking=%s', (isSeeking) => {
    const onToggleLike = jest.fn();
    renderCard(locale, { surface: 'mobile', offer: { ...fixture, is_seeking: isSeeking }, onToggleLike });
    const like = card().getByRole('button', { name: label, exact: true });
    expect(like).toHaveAttribute('title', label);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(like);
    expect(onToggleLike).toHaveBeenCalledTimes(1);
    expect(onToggleLike).toHaveBeenCalledWith(7);
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });

  it.each([false, true])('retains the mobile detail Like summary for seeking=%s', (isSeeking) => {
    renderCard(locale, { surface: 'detail', offer: { ...fixture, is_seeking: isSeeking } });
    const summary = card().getByText(label, { exact: true }).parentElement!;
    expect(summary).toHaveTextContent('137');
    expect(summary.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
    expect(card().getByText('Fixture detail')).toBeInTheDocument();
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });
});

describe('locale switching without replacing cards', () => {
  it.each(['desktop', 'mobile', 'detail'] as const)('updates the existing %s card through every real locale', (surface) => {
    const onToggleLike = jest.fn();
    renderCard('sk', { surface, onToggleLike });
    const initial = surface === 'detail'
      ? card().getByText('Páči sa mi to', { exact: true })
      : card().getByRole('button', { name: 'Páči sa mi to', exact: true });
    if (surface === 'desktop') {
      fireEvent.click(activeDesktopSide().getByRole('button', { name: 'Otočiť' }));
    }
    for (const [locale, label] of labels) {
      fireEvent.click(screen.getByRole('button', { name: `locale:${locale}`, exact: true }));
      const translated = surface === 'detail'
        ? card().getByText(label, { exact: true })
        : card().getByRole('button', { name: label, exact: true });
      expect(translated).toBe(initial);
      if (surface === 'desktop') {
        expect(activeDesktopSide().getByText(label, { exact: true }).parentElement).toHaveTextContent('137');
      }
      if (locale !== 'sk') {
        expect(card().queryByText('Páči sa mi to', { exact: true })).not.toBeInTheDocument();
        expect(card().queryByRole('button', { name: 'Páči sa mi to', exact: true })).not.toBeInTheDocument();
      }
      expect(localStorage.getItem('appLocale')).toBe(locale);
    }
    expect(onToggleLike).not.toHaveBeenCalled();
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });
});

describe.each(['pl', 'cs'] as const)('%s Offer Watch front-only Like opt-out', (locale) => {
  it.each([false, true])('keeps the front action absent and the translated back summary for seeking=%s', (isSeeking) => {
    renderCard(locale, { surface: 'desktop', showLikeAction: false, offer: { ...fixture, is_seeking: isSeeking } });
    for (const [, label] of labels) {
      expect(card().queryByRole('button', { name: label, exact: true })).not.toBeInTheDocument();
      expect(activeDesktopSide().queryByText(label, { exact: true })).not.toBeInTheDocument();
    }
    fireEvent.click(activeDesktopSide().getByRole('button', { name: 'Otočiť' }));
    expect(activeDesktopSide().getByText('Fixture detail')).toBeInTheDocument();
    const expectedLabel = labels.find(([value]) => value === locale)![1];
    const summary = activeDesktopSide().getByText(expectedLabel, { exact: true }).parentElement!;
    expect(summary).toHaveTextContent('137');
    expect(summary.closest('button, a, [role="button"]')).toBeNull();
    fireEvent.click(summary);
    expect(activeDesktopSide().getByText('Fixture detail')).toBeInTheDocument();
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });
});
