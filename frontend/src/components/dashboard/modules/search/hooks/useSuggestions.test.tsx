import { act, renderHook, waitFor } from '@testing-library/react';

import { api } from '@/lib/api';
import type { User } from '@/types';
import type { SearchStateProps } from './useSearchState';
import { useSuggestions } from './useSuggestions';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: {
    dashboard: {
      searchRecommendations: '/recommendations/',
      search: '/search/',
    },
  },
}));

const searchState = {
  setResults: jest.fn(),
  setHasSearched: jest.fn(),
  setIsFromRecentSearch: jest.fn(),
  setError: jest.fn(),
};

describe('useSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: { skills: [] } });
  });

  it('fetches fresh suggestions whenever the suggestions view is reopened', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useSuggestions({
          user: { id: 42 } as unknown as User,
          searchState: searchState as unknown as SearchStateProps,
          enabled,
        }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    act(() => rerender({ enabled: false }));
    expect(result.current.suggestedSkills).toEqual([]);

    act(() => rerender({ enabled: true }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
