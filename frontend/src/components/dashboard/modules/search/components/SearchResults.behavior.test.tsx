import { createRef, type ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { User } from '@/types';
import type { SearchResults as ResultData, SearchSkill, SearchUserResult } from '../types';
import type { SearchStateProps } from '../hooks/useSearchState';
import { SearchResults } from './SearchResults';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const account = { id: 41 } as User;
const translator = (_key: string, fallback: string) => fallback;
const skill: SearchSkill = {
  id: 78, category: 'Technológie', subcategory: 'Monitorovanie', description: '',
  user_id: 42, user_display_name: 'Autor ponuky',
};
const otherUser: SearchUserResult = {
  id: 42, display_name: 'Anna Nová', slug: 'anna-nova', is_verified: false,
};

/** Construct valid component state; mutations are observed through its public callbacks. */
function state(overrides: Partial<SearchStateProps> = {}): SearchStateProps {
  return {
    searchQuery: 'monitorovanie', setSearchQuery: jest.fn(),
    results: { skills: [], users: [] }, setResults: jest.fn(),
    isSearching: false, setIsSearching: jest.fn(), error: null, setError: jest.fn(),
    hasSearched: true, setHasSearched: jest.fn(),
    isFromRecentSearch: false, setIsFromRecentSearch: jest.fn(),
    isFilterOpen: false, setIsFilterOpen: jest.fn(),
    showSkills: true, setShowSkills: jest.fn(), showUsers: true, setShowUsers: jest.fn(),
    offerType: 'all', setOfferType: jest.fn(), onlyMyLocation: false, setOnlyMyLocation: jest.fn(),
    priceMin: '', setPriceMin: jest.fn(), priceMax: '', setPriceMax: jest.fn(),
    searchInputRef: createRef<HTMLInputElement>(), searchDebounceRef: { current: null },
    searchAbortControllerRef: { current: null }, resetFilters: jest.fn(), clearSearch: jest.fn(),
    ...overrides,
  };
}

interface Fixture {
  skills?: SearchSkill[];
  users?: SearchUserResult[];
  recent?: ResultData[];
  suggested?: SearchSkill[];
  searchState?: Partial<SearchStateProps>;
  onSkillClick?: ComponentProps<typeof SearchResults>['onSkillClick'];
  onUserClick?: ComponentProps<typeof SearchResults>['onUserClick'];
}

/** Mount real result cards, labels and click handling with ordinary public props. */
function renderResults({ skills = [], users = [], recent = [], suggested = [], ...options }: Fixture = {}) {
  const searchState = state({ results: { skills, users }, ...options.searchState });
  const handleRecentResultClick = jest.fn();
  const handleSuggestionClick = jest.fn();
  const searchApi: ComponentProps<typeof SearchResults>['searchApi'] = {
    handleSearch: jest.fn(), filteredSkills: skills, hasResults: skills.length + users.length > 0,
    hasPanelResults: (searchState.showSkills && skills.length > 0) || (searchState.showUsers && users.length > 0),
    invalidateCache: jest.fn(), diagnostics: { enabled: false, snapshot: null, setEnabled: jest.fn() },
  };
  const view = render(<SearchResults user={account} searchState={searchState} searchApi={searchApi}
    recentSearches={{ recentSearches: recent, handleRecentResultClick }}
    suggestions={{ suggestedSkills: suggested, handleSuggestionClick }}
    onSkillClick={options.onSkillClick} onUserClick={options.onUserClick} t={translator} />);
  return { ...view, searchState, handleRecentResultClick, handleSuggestionClick };
}

beforeEach(() => { jest.clearAllMocks(); });

describe('SearchResults skill cards retain their existing presentation and navigation', () => {
  it.each<[Partial<SearchSkill>, string, string, string]>([
    [{ user_id: 41, location: 'Bratislava', price_from: 20 }, 'od 20€', 'Vy', 'Bratislava'],
    [{ is_seeking: true, district: 'Brno', price_from: 15, price_currency: 'Kč' }, 'do 15Kč', 'Autor ponuky', 'Brno'],
    [{ price_negotiable: true, price_from: null }, 'Dohodou', 'Autor ponuky', 'Bez lokality'],
    [{ price_from: 0, price_currency: '$' }, 'od 0$', 'Autor ponuky', 'Bez lokality'],
  ])('renders price and owner without changing the destination (%j)', (changes, price, owner, location) => {
    const onSkillClick = jest.fn();
    renderResults({ skills: [{ ...skill, ...changes }], onSkillClick });
    const button = screen.getByRole('button', { name: /Monitorovanie/ });
    expect(within(button).getByText(price)).toBeInTheDocument();
    expect(within(button).getByText(owner)).toBeInTheDocument();
    expect(within(button).getByText(location)).toBeInTheDocument();
    expect(within(button).getByText(changes.is_seeking ? 'HĽADÁM' : 'PONÚKAM')).toBeInTheDocument();
    fireEvent.click(button);
    expect(onSkillClick).toHaveBeenCalledWith(changes.user_id ?? 42, 78, null);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('uses category and neutral locality when optional metadata and price are absent', () => {
    renderResults({ skills: [{ ...skill, subcategory: '', user_display_name: '', price_from: null }] });
    const card = screen.getByRole('button', { name: /Technológie/ });
    expect(card).toHaveTextContent('Bez lokality');
    expect(card).not.toHaveTextContent('Autor ponuky');
    expect(card).not.toHaveTextContent(' • ');
    expect(card).not.toHaveTextContent('€');
    fireEvent.click(card);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ['  inline-owner  ', 'inline-owner'],
    ['', 'anna-nova'],
    ['   ', 'anna-nova'],
    [undefined, 'anna-nova'],
  ])('resolves owner slug %j using the existing priority', (ownerSlug, expected) => {
    const onSkillClick = jest.fn();
    renderResults({ skills: [{ ...skill, owner_slug: ownerSlug }], users: [otherUser], onSkillClick });
    fireEvent.click(screen.getByRole('button', { name: /Monitorovanie/ }));
    expect(onSkillClick).toHaveBeenCalledWith(42, 78, expected);
  });

  it('passes null if both the inline slug and result owner slug are absent', () => {
    const onSkillClick = jest.fn();
    renderResults({ skills: [skill], users: [{ ...otherUser, slug: undefined }], onSkillClick });
    fireEvent.click(screen.getByRole('button', { name: /Monitorovanie/ }));
    expect(onSkillClick).toHaveBeenCalledWith(42, 78, null);
  });

  it('does not navigate a card that is missing its owner identifier', () => {
    const onSkillClick = jest.fn();
    renderResults({ skills: [{ ...skill, user_id: undefined }], onSkillClick });
    fireEvent.click(screen.getByRole('button', { name: /Monitorovanie/ }));
    expect(onSkillClick).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('SearchResults user cards retain their existing profile navigation', () => {
  it.each(['anna-nova', null, undefined])('forwards the complete result and slug %j', (slug) => {
    const onUserClick = jest.fn();
    const user = { ...otherUser, slug };
    renderResults({ users: [user], onUserClick });
    fireEvent.click(screen.getByRole('button', { name: /Anna Nová/ }));
    expect(onUserClick).toHaveBeenCalledWith(42, slug ?? null, user);
  });

  it('keeps user cards inert if their profile callback is unavailable', () => {
    renderResults({ users: [otherUser] });
    fireEvent.click(screen.getByRole('button', { name: /Anna Nová/ }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('uses goToProfile for the current account instead of the foreign-profile callback', () => {
    const onUserClick = jest.fn();
    const goToProfile = jest.fn();
    window.addEventListener('goToProfile', goToProfile);
    try {
      renderResults({ users: [{ ...otherUser, id: account.id }], onUserClick });
      fireEvent.click(screen.getByRole('button', { name: /Vy/ }));
      expect(goToProfile).toHaveBeenCalledTimes(1);
      expect(onUserClick).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToProfile', goToProfile);
    }
  });

  it('shows provided avatar and verification badge, or initials when no avatar exists', () => {
    const { container } = renderResults({ users: [
      { ...otherUser, avatar_url: '/test-avatar.png', is_verified: true },
      { id: 43, display_name: 'Peter Kováč', is_verified: false },
    ] });
    expect(screen.getByRole('img', { name: 'Anna Nová' })).toHaveAttribute('src', '/test-avatar.png');
    expect(screen.getAllByTestId('verified-badge')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Peter Kováč/ })).toHaveTextContent('PK');
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });
});

describe('SearchResults recent searches and recommendations', () => {
  it('limits recent entries to five and selects their original complete result', () => {
    const recent = Array.from({ length: 6 }, (_, index) => ({
      skills: [{ ...skill, id: 100 + index, subcategory: `História ${index}` }], users: [otherUser],
    }));
    const { handleRecentResultClick } = renderResults({ recent, searchState: { searchQuery: '', hasSearched: false } });
    expect(screen.getByText('Posledné vyhľadávania')).toBeInTheDocument();
    expect(screen.queryByText('História 5')).not.toBeInTheDocument();
    const card = screen.getByRole('button', { name: /História 0/ });
    expect(card).toHaveTextContent('+1');
    expect(card).toHaveTextContent('PONÚKAM');
    fireEvent.click(card);
    expect(handleRecentResultClick).toHaveBeenCalledWith(recent[0]);
  });

  it('ignores empty history entries and renders seeking, category-only and user-only entries', () => {
    const recent = [
      { skills: [], users: [] },
      { skills: [{ ...skill, is_seeking: true, subcategory: '' }], users: [] },
      { skills: [], users: [otherUser] },
    ];
    const { handleRecentResultClick } = renderResults({ recent, searchState: { searchQuery: '', hasSearched: false } });
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Technológie/ })).toHaveTextContent('HĽADÁM');
    const userButton = screen.getByRole('button', { name: 'Anna Nová' });
    expect(userButton).not.toHaveTextContent('+');
    fireEvent.click(userButton);
    expect(handleRecentResultClick).toHaveBeenCalledWith(recent[2]);
  });

  it('routes recommendation clicks through the suggestion callback, not ordinary card navigation', () => {
    const onSkillClick = jest.fn();
    const { handleSuggestionClick } = renderResults({ suggested: [skill], onSkillClick,
      searchState: { searchQuery: '', hasSearched: false } });
    expect(screen.getByText('Návrhy pre vás')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Monitorovanie/ }));
    expect(handleSuggestionClick).toHaveBeenCalledWith(skill);
    expect(onSkillClick).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['desktop', 'mobile'])('keeps the %s recent-result back action connected to clearSearch', (platform) => {
    const { searchState } = renderResults({ skills: [skill], searchState: { searchQuery: '', isFromRecentSearch: true } });
    const buttons = screen.getAllByRole('button', { name: 'Späť' });
    fireEvent.click(buttons[platform === 'desktop' ? 0 : 1]);
    expect(searchState.clearSearch).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not mix history or suggestions into an active query', () => {
    renderResults({ recent: [{ skills: [skill], users: [] }], suggested: [skill],
      searchState: { searchQuery: 'nové', hasSearched: false } });
    expect(screen.queryByText('Posledné vyhľadávania')).not.toBeInTheDocument();
    expect(screen.queryByText('Návrhy pre vás')).not.toBeInTheDocument();
    expect(screen.getByText('Stlačte Enter pre vyhľadanie')).toBeInTheDocument();
  });
});
