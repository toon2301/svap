/**
 * Prepisy adresy pri zvýrazňovaní ponuky NESMÚ zahodiť fragment.
 *
 * Hook adresu prepisuje na troch miestach – dopĺňa `?highlight=` z
 * `sessionStorage`, čistí parametre pri odchode z profilu a čistí ich po
 * vypršaní časovača. Všetky tri menia VÝHRADNE parametre zvýraznenia, takže
 * `#fragment` musí prežiť.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const replaceMock = jest.fn((url: string) => {
  window.history.replaceState(null, '', url);
});
let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

import { useDashboardHighlighting } from '../useDashboardHighlighting';

beforeEach(() => {
  jest.useRealTimers();
  replaceMock.mockClear();
  searchParams = new URLSearchParams();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/dashboard/users/peter');
});

describe('obnova zvýraznenia zo sessionStorage', () => {
  it('keeps the fragment when it puts ?highlight= back', async () => {
    window.history.replaceState(null, '', '/dashboard/users/peter#sekcia');
    sessionStorage.setItem('highlightedSkillId', '55');
    sessionStorage.setItem('highlightedSkillTime', String(Date.now()));

    renderHook(() => useDashboardHighlighting({ activeModule: 'user-profile' }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard/users/peter?highlight=55#sekcia',
    );
  });
});

describe('vypršanie časovača zvýraznenia', () => {
  it('keeps the fragment when it strips the highlight params', async () => {
    jest.useFakeTimers();
    window.history.replaceState(
      null,
      '',
      '/dashboard/users/peter?highlight=55#sekcia',
    );
    searchParams = new URLSearchParams('highlight=55');
    sessionStorage.setItem('highlightedSkillTime', String(Date.now()));

    renderHook(() => useDashboardHighlighting({ activeModule: 'user-profile' }));

    // Zvýraznenie po minúte samo zhasne a upratuje po sebe adresu.
    act(() => {
      jest.advanceTimersByTime(61 * 1000);
    });

    expect(replaceMock).toHaveBeenCalledWith('/dashboard/users/peter#sekcia');
    jest.useRealTimers();
  });
});

describe('odchod z profilu', () => {
  it('keeps the fragment when it clears the params on leave', () => {
    window.history.replaceState(
      null,
      '',
      '/dashboard/users/peter?highlight=55#sekcia',
    );
    searchParams = new URLSearchParams('highlight=55');

    const { rerender } = renderHook(
      ({ module }: { module: string }) =>
        useDashboardHighlighting({ activeModule: module }),
      { initialProps: { module: 'user-profile' } },
    );

    // Odchod na modul, ktorý karty ponúk nezvýrazňuje.
    rerender({ module: 'messages' });

    expect(window.location.pathname + window.location.search + window.location.hash)
      .toBe('/dashboard/users/peter#sekcia');
  });
});
