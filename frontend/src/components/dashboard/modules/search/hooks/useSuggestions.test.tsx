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

describe('useSuggestions – prepnutie používateľa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drops the previous user suggestions before the new request lands', async () => {
    const firstUserSkills = [{ id: 1, title: 'Od prveho' }];
    let releaseSecond: ((value: unknown) => void) | null = null;

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: { skills: firstUserSkills } })
      // Druhý request zámerne visí – práve v tomto okne sa nesmú zobrazovať
      // návrhy predošlého používateľa.
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          releaseSecond = resolve;
        }),
      );

    const { result, rerender } = renderHook(
      ({ userId }) =>
        useSuggestions({
          user: { id: userId } as unknown as User,
          searchState: searchState as unknown as SearchStateProps,
          enabled: true,
        }),
      { initialProps: { userId: 42 } },
    );

    await waitFor(() => expect(result.current.suggestedSkills).toHaveLength(1));

    rerender({ userId: 43 });

    // Ešte pred dobehnutím nového requestu musí byť zoznam prázdny.
    expect(result.current.suggestedSkills).toEqual([]);

    await act(async () => {
      releaseSecond?.({ data: { skills: [{ id: 2, title: 'Od druheho' }] } });
    });

    await waitFor(() => expect(result.current.suggestedSkills).toHaveLength(1));
    expect(result.current.suggestedSkills[0]).toMatchObject({ id: 2 });
  });
});
