import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import { setOfferLikeState } from '@/components/dashboard/modules/profile/offerLikesApi';
import type { Offer } from '@/components/dashboard/modules/profile/profileOffersTypes';
import SearchOfferCard from './SearchOfferCard';
import sk from '../../../messages/sk.json';
import cs from '../../../messages/cs.json';
import en from '../../../messages/en.json';
import de from '../../../messages/de.json';
import pl from '../../../messages/pl.json';
import hu from '../../../messages/hu.json';

jest.unmock('@/contexts/LanguageContext');
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams('q=logo');
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/components/dashboard/modules/profile/offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('@/components/dashboard/modules/shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('@/components/dashboard/modules/shared/OfferImageGalleryLightbox', () => ({
  __esModule: true, default: () => null,
}));

const setLike = jest.mocked(setOfferLikeState);
const messages = { sk, cs, en, de, pl, hu };
type Locale = keyof typeof messages;
const offer: Offer = {
  id: 17, category: 'Design', subcategory: 'Logo', description: 'Search logo card',
  detailed_description: 'Full search logo detail', is_seeking: false,
  is_liked_by_me: false, likes_count: 4, average_rating: 4.5, reviews_count: 3,
  tags: ['logo'], price_from: 20, location: 'Bratislava',
};
type ResultProps = {
  cardOffer?: Offer;
  accountType?: 'personal' | 'business';
  compactTop?: boolean;
};
function ConnectedResult({ cardOffer = offer, accountType = 'personal', compactTop = true }: ResultProps) {
  const { t } = useLanguage();
  return <SearchOfferCard
    offer={cardOffer} accountType={accountType} t={t} isFlipped={false}
    onToggleFlip={jest.fn()} isOtherUserProfile compactTop={compactTop}
  />;
}

let mobile = true;
const viewportListeners = new Set<() => void>();
let matchMediaSpy: jest.SpyInstance;

function renderResult(props: ResultProps = {}, locale: Locale = 'sk') {
  localStorage.setItem('appLocale', locale);
  const result = render(<div id="app-root"><LanguageProvider><ConnectedResult {...props} /></LanguageProvider></div>);
  const card = result.container.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
  expect(card).not.toBeNull();
  return { ...result, card, localeMessages: messages[locale] };
}

function openDetail(card: HTMLElement) {
  fireEvent.click(card);
  fireEvent.click(card);
  expect(screen.getByRole('heading', { name: sk.skills.description, level: 2 })).toBeInTheDocument();
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
  mockSearchParams = new URLSearchParams('q=logo');
  mobile = true;
  viewportListeners.clear();
  setLike.mockResolvedValue({ offer_id: 17, is_liked_by_me: true, likes_count: 5 });
  matchMediaSpy = jest.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    get matches() { return query === '(max-width: 1023px)' && mobile; },
    media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: (_event: string, listener: () => void) => { viewportListeners.add(listener); },
    removeEventListener: (_event: string, listener: () => void) => { viewportListeners.delete(listener); },
    dispatchEvent: () => true,
  }));
});

afterEach(() => {
  matchMediaSpy.mockRestore();
  localStorage.clear();
  document.body.style.overflow = '';
});

describe('real mobile search result card and profile detail sheet', () => {
  describe.each(Object.keys(messages) as Locale[])('%s locale', (locale) => {
    it.each([false, true])('uses profile-style strips and a two-tap sheet for seeking=%s', (isSeeking) => {
      const { card, container, localeMessages: text } = renderResult({ cardOffer: { ...offer, is_seeking: isSeeking } }, locale);
      const banner = isSeeking ? text.skills.search : text.skills.offering;
      expect(within(card).getByText(banner, { exact: true })).toBeInTheDocument();
      expect(card).toHaveClass('rounded-b-2xl', 'border-0', 'shadow-none');
      expect(screen.queryByRole('button', { name: 'Otočiť' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Pridať recenziu' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: text.skills.message })).not.toBeInTheDocument();
      fireEvent.click(card);
      expect(within(card).queryByText(banner, { exact: true })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: text.skills.description })).not.toBeInTheDocument();
      fireEvent.click(card);
      const heading = screen.getByRole('heading', { name: text.skills.description, level: 2 });
      expect(heading.closest('#app-root')).toBe(container.firstElementChild);
      expect(screen.getByText(offer.detailed_description!)).toBeInTheDocument();
      expect(screen.getByText(text.skills.likes, { exact: true }).parentElement).toHaveTextContent('4');
      expect(document.body.style.overflow).toBe('hidden');
      fireEvent.click(screen.getByRole('button', { name: text.common.close }));
      expect(screen.queryByRole('heading', { name: text.skills.description })).not.toBeInTheDocument();
      expect(within(card).getByText(banner, { exact: true })).toBeInTheDocument();
      expect(document.body.style.overflow).not.toBe('hidden');
      expect(mockPush).not.toHaveBeenCalled();
      expect(setLike).not.toHaveBeenCalled();
    });
  });

  it.each(['Enter', ' '])('preserves two-step card keyboard activation for %j', (key) => {
    const { card } = renderResult();
    fireEvent.keyDown(card, { key });
    expect(screen.queryByRole('heading', { name: sk.skills.description })).not.toBeInTheDocument();
    fireEvent.keyDown(card, { key });
    expect(screen.getByRole('heading', { name: sk.skills.description })).toBeInTheDocument();
  });

  it('keeps Like independent from taps and displays the authoritative count in the real sheet', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof setOfferLikeState>>) => void;
    setLike.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { card } = renderResult();
    const like = within(card).getByRole('button', { name: sk.skills.likes });
    fireEvent.keyDown(like, { key: 'Enter' });
    expect(within(card).getByText(sk.skills.offering, { exact: true })).toBeInTheDocument();
    fireEvent.click(like);
    expect(setLike).toHaveBeenCalledTimes(1);
    expect(setLike).toHaveBeenCalledWith(17, true);
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByText(sk.skills.offering, { exact: true })).toBeInTheDocument();
    await act(async () => resolve({ offer_id: 17, is_liked_by_me: true, likes_count: 37 }));
    expect(like).not.toBeDisabled();
    openDetail(card);
    const summary = screen.getByText(sk.skills.likes, { exact: true }).parentElement!;
    expect(summary).toHaveTextContent('37');
    expect(summary.closest('button')).toBeNull();
    expect(summary.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
  });

  it('rolls back an API failure with one translated toast and keeps the result usable', async () => {
    setLike.mockRejectedValue(new Error('Transport failure'));
    const { card } = renderResult();
    const like = within(card).getByRole('button', { name: sk.skills.likes });
    fireEvent.click(like);
    await waitFor(() => expect(like).not.toBeDisabled());
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(sk.reviews.likeUpdateFailed);
    openDetail(card);
    expect(screen.getByText(sk.skills.likes, { exact: true }).parentElement).toHaveTextContent('4');
  });

  it('opens business hours from the real sheet and closes hours without closing the detail', () => {
    const hours = { monday: { enabled: true, from: '09:00', to: '17:00' } };
    const { card } = renderResult({ accountType: 'business', cardOffer: { ...offer, opening_hours: hours } });
    expect(screen.getByText('PRO')).toBeInTheDocument();
    openDetail(card);
    fireEvent.click(screen.getByRole('button', { name: sk.skills.openingHours.title }));
    expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument();
    const closeButtons = screen.getAllByRole('button', { name: sk.common.close });
    expect(closeButtons).toHaveLength(2);
    fireEvent.click(closeButtons[1]);
    expect(screen.queryByText('09:00 – 17:00')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: sk.skills.description })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: sk.common.close }));
    openDetail(card);
    expect(screen.queryByText('09:00 – 17:00')).not.toBeInTheDocument();
  });

  it('does not open a business hours modal when all opening hours are disabled', () => {
    const { card } = renderResult({ accountType: 'business', cardOffer: { ...offer, opening_hours: { monday: { enabled: false, from: '', to: '' } } } });
    openDetail(card);
    const hours = screen.getByRole('button', { name: sk.skills.openingHours.title });
    expect(hours).toBeDisabled();
    fireEvent.click(hours);
    expect(screen.getAllByRole('button', { name: sk.common.close })).toHaveLength(1);
  });

  it('closes via the real backdrop, restores body scroll and resets the two-tap banner', () => {
    document.body.style.overflow = 'auto';
    const { card } = renderResult();
    openDetail(card);
    const backdrop = Array.from(document.querySelectorAll('div.fixed.inset-0'))
      .find((node) => node.classList.contains('z-[60]'));
    expect(backdrop).toBeDefined();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole('heading', { name: sk.skills.description })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('auto');
    fireEvent.click(card);
    expect(screen.queryByRole('heading', { name: sk.skills.description })).not.toBeInTheDocument();
    fireEvent.click(card);
    expect(screen.getByRole('heading', { name: sk.skills.description })).toBeInTheDocument();
  });

  it.each(['q=other', 'q=logo&page=2', 'q=logo&type=seeking'])('closes stale detail and hours after real query props change to %s', (query) => {
    const resultProps = { accountType: 'business' as const, cardOffer: { ...offer, opening_hours: { monday: { enabled: true, from: '09:00', to: '17:00' } } } };
    const { card, rerender } = renderResult(resultProps);
    openDetail(card);
    fireEvent.click(screen.getByRole('button', { name: sk.skills.openingHours.title }));
    mockSearchParams = new URLSearchParams(query);
    rerender(<div id="app-root"><LanguageProvider><ConnectedResult {...resultProps} /></LanguageProvider></div>);
    expect(screen.queryByRole('heading', { name: sk.skills.description })).not.toBeInTheDocument();
    expect(screen.queryByText('09:00 – 17:00')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(screen.getByText(sk.skills.offering, { exact: true })).toBeInTheDocument();
  });

  it('closes details when switching to desktop and preserves the original desktop flip card', () => {
    const { card } = renderResult();
    openDetail(card);
    act(() => { mobile = false; viewportListeners.forEach((listener) => listener()); });
    expect(screen.queryByRole('heading', { name: sk.skills.description })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Otočiť' })).toHaveLength(2);
    expect(document.body.style.overflow).not.toBe('hidden');
    act(() => { mobile = true; viewportListeners.forEach((listener) => listener()); });
    expect(screen.queryByRole('button', { name: 'Otočiť' })).not.toBeInTheDocument();
    expect(screen.getByText(sk.skills.offering, { exact: true })).toBeInTheDocument();
  });
});
