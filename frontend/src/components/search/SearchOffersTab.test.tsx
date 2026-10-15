import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SearchOffersTab } from './SearchOffersTab';
import { openUserProfileFromSearch } from '@/components/dashboard/modules/profile/openUserProfileFromSearch';
import type ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
import type { Offer } from '@/components/dashboard/modules/profile/profileOffersTypes';

const mockCard = jest.fn();
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/components/dashboard/modules/profile/openUserProfileFromSearch', () => ({
  openUserProfileFromSearch: jest.fn(),
}));
jest.mock('./FilterChips', () => ({ FilterChips: () => null }));
jest.mock('./SearchResultSkeleton', () => ({ SearchResultSkeleton: () => <div data-testid="skeleton" /> }));
jest.mock('./SearchOfferCard', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<typeof ProfileOfferCard>) => {
    mockCard(props);
    return <button onClick={props.onToggleFlip} data-testid="result">{props.offer.description}</button>;
  },
}));
jest.mock('./SearchFilterSelect', () => ({
  __esModule: true,
  default: ({ value, options, onChange }: {
    value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
  }) => <select value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>,
}));

const offer: Offer = {
  id: 71, category: 'Domácnosť', subcategory: 'Maliarske práce', description: 'Maľovanie',
  user_display_name: 'Ada', user_id: 21, owner_slug: 'ada', owner_user_type: 'individual',
  owner_avatar_url: '/avatar.webp',
};
type Props = React.ComponentProps<typeof SearchOffersTab>;

/** Exercise parent filtering/paging and the actual author header without duplicating card internals. */
function renderTab(overrides: Partial<Props> = {}) {
  const props: Props = {
    t: (_key, fallback) => fallback ?? '', trimmedQ: 'ma', loading: false, results: [offer],
    flippedCards: new Set(), onToggleFlip: jest.fn(), minRating: null, onMinRatingChange: jest.fn(),
    priceMin: '', onPriceMinChange: jest.fn(), priceMax: '', onPriceMaxChange: jest.fn(),
    offerType: 'all', onOfferTypeChange: jest.fn(), hasActiveFilters: false,
    onClearAllFilters: jest.fn(), page: 1, totalPages: 1, onPageChange: jest.fn(), ...overrides,
  };
  return { ...render(<SearchOffersTab {...props} />), props };
}

beforeEach(() => jest.clearAllMocks());

it('forwards the real offer and existing desktop contract to the shared responsive adapter', () => {
  const { props } = renderTab({ flippedCards: new Set(['71']) });
  const card = mockCard.mock.calls[0][0];
  expect(card).toMatchObject({
    offer, accountType: 'personal', isFlipped: true, isOtherUserProfile: true,
    ownerDisplayName: 'Ada', compactTop: true, isRequestDisabled: false,
  });
  expect(card.onRequestClick).toBeUndefined();
  expect(card.onMessageClick).toBeUndefined();
  fireEvent.click(screen.getByTestId('result'));
  expect(props.onToggleFlip).toHaveBeenCalledWith('71');
  fireEvent.click(screen.getByRole('button', { name: /Ada/ }));
  expect(openUserProfileFromSearch).toHaveBeenCalledWith(mockRouter, 'ada');
});

it('preserves company styling, ID fallback and an absent display name', () => {
  renderTab({ results: [{ ...offer, owner_user_type: 'company', owner_slug: ' ', user_display_name: undefined }] });
  expect(mockCard.mock.calls[0][0]).toMatchObject({ accountType: 'business', ownerDisplayName: undefined });
  fireEvent.click(screen.getByRole('button', { name: /Používateľ/ }));
  expect(openUserProfileFromSearch).toHaveBeenCalledWith(mockRouter, '21');
});

it('does not navigate when an owner identifier is unavailable', () => {
  renderTab({ results: [{ ...offer, owner_slug: '', user_id: undefined }] });
  fireEvent.click(screen.getByRole('button', { name: /Ada/ }));
  expect(openUserProfileFromSearch).not.toHaveBeenCalled();
});

it.each([
  ['Design', 'Logo', 'Description', 'Design-Logo-Description'],
  ['', '', '', 'cat-sub-desc'],
])('keeps the existing fallback flip identity for missing API IDs (%s)', (category, subcategory, description, identity) => {
  const { props } = renderTab({ results: [{ ...offer, id: undefined as unknown as number, category, subcategory, description }] });
  fireEvent.click(screen.getByTestId('result'));
  expect(props.onToggleFlip).toHaveBeenCalledWith(identity);
});

it('shows eight loading skeletons without removing already loaded cards during refresh', () => {
  const view = renderTab({ loading: true, results: [] });
  expect(screen.getAllByTestId('skeleton')).toHaveLength(8);
  expect(mockCard).not.toHaveBeenCalled();
  view.rerender(<SearchOffersTab {...view.props} results={[offer]} />);
  expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  expect(screen.getByTestId('result')).toBeInTheDocument();
});

it.each([true, false])('keeps meaningful empty query/results copy and filter reset visibility (query=%s)', (hasQuery) => {
  const { props } = renderTab({ results: [], trimmedQ: hasQuery ? 'xyz' : '', hasActiveFilters: true });
  expect(screen.getByText(hasQuery ? /Žiadne výsledky pre/ : /Zadajte výraz/)).toBeInTheDocument();
  expect(screen.queryByTestId('result')).not.toBeInTheDocument();
  if (hasQuery) {
    fireEvent.click(screen.getByRole('button', { name: 'Vymazať filtre' }));
    expect(props.onClearAllFilters).toHaveBeenCalledTimes(1);
    expect(screen.getByText('odstrániť filtre')).toBeInTheDocument();
  } else {
    expect(screen.queryByRole('button', { name: 'Vymazať filtre' })).not.toBeInTheDocument();
  }
});

it('does not offer a redundant filter reset for an unfiltered empty search', () => {
  renderTab({ results: [], hasActiveFilters: false });
  expect(screen.queryByRole('button', { name: 'Vymazať filtre' })).not.toBeInTheDocument();
});

it('keeps all existing rating, price and card-type change callbacks and controlled values', () => {
  const { props } = renderTab({ minRating: 4, priceMin: '5', priceMax: '15', offerType: 'offer' });
  const [rating, type] = screen.getAllByRole('combobox');
  expect(rating).toHaveValue('4');
  fireEvent.change(rating, { target: { value: '3' } });
  expect(props.onMinRatingChange).toHaveBeenLastCalledWith(3);
  fireEvent.change(rating, { target: { value: '' } });
  expect(props.onMinRatingChange).toHaveBeenLastCalledWith(null);
  const [minimum, maximum] = screen.getAllByRole('spinbutton');
  expect(minimum).toHaveValue(5);
  expect(maximum).toHaveValue(15);
  fireEvent.change(minimum, { target: { value: '7' } });
  fireEvent.change(maximum, { target: { value: '20' } });
  expect(props.onPriceMinChange).toHaveBeenCalledWith('7');
  expect(props.onPriceMaxChange).toHaveBeenCalledWith('20');
  fireEvent.change(type, { target: { value: 'seeking' } });
  expect(props.onOfferTypeChange).toHaveBeenCalledWith('seeking');
});

it('preserves pagination boundaries, numbered navigation and active-page styling', () => {
  const view = renderTab({ page: 2, totalPages: 3 });
  expect(screen.getByRole('button', { name: '2', exact: true })).toHaveClass('bg-purple-600');
  fireEvent.click(screen.getByRole('button', { name: 'Predošlá' }));
  expect(view.props.onPageChange).toHaveBeenLastCalledWith(1);
  fireEvent.click(screen.getByRole('button', { name: 'Ďalšia' }));
  expect(view.props.onPageChange).toHaveBeenLastCalledWith(3);
  fireEvent.click(screen.getByRole('button', { name: '1', exact: true }));
  expect(view.props.onPageChange).toHaveBeenLastCalledWith(1);
  view.rerender(<SearchOffersTab {...view.props} page={1} />);
  expect(screen.getByRole('button', { name: 'Predošlá' })).toBeDisabled();
  view.rerender(<SearchOffersTab {...view.props} page={3} />);
  expect(screen.getByRole('button', { name: 'Ďalšia' })).toBeDisabled();
});
