/**
 * Hodnoty odvodené z adresy dashboardu: recenzie, príspevok, portfólio a správy.
 *
 * Hook číta len cestu a query, modul nekontroluje (to robí volajúci). Okrem
 * hodnôt sa overuje aj stabilita výsledkov: `portfolioCreateMatch` je
 * závislosťou efektu v DashboardContent, takže nesmie dostať novú identitu pri
 * zmene, ktorá sa ho netýka.
 */

import { renderHook } from '@testing-library/react';
import { useDashboardRouteParams } from '../useDashboardRouteParams';

type Pathname = string | null | undefined;
type Search = URLSearchParams | null | undefined;

function paramsFor(pathname: Pathname, search: Search = new URLSearchParams()) {
  return renderHook(() => useDashboardRouteParams(pathname, search)).result.current;
}

describe('recenzie ponuky z adresy', () => {
  const CASES: Array<[Pathname, number | null]> = [
    ['/dashboard/offers/12/reviews', 12],
    ['/dashboard/offers/12/reviews/', 12],
    ['/dashboard/offers/007/reviews', 7],
    ['/dashboard/offers/0/reviews', 0],
    ['/dashboard/offers/12/reviews/extra', null],
    ['/dashboard/offers/12/reviews2', null],
    ['/dashboard/offers/12', null],
    ['/dashboard/offers/abc/reviews', null],
    ['/dashboard/offers/-3/reviews', null],
    ['/dashboard/offers/1.5/reviews', null],
    ['/dashboard/offers//reviews', null],
    ['/x/dashboard/offers/12/reviews', null],
    ['/dashboard', null],
    ['', null],
    [null, null],
    [undefined, null],
  ];

  it.each(CASES)('%j → %j', (pathname, expected) => {
    expect(paramsFor(pathname).offerIdFromReviewsPath).toBe(expected);
  });
});

describe('príspevok vo feede z adresy', () => {
  const CASES: Array<[Pathname, number | null]> = [
    ['/dashboard/feed/5', 5],
    ['/dashboard/feed/5/', 5],
    ['/dashboard/feed/007', 7],
    ['/dashboard/feed/0', null],
    ['/dashboard/feed/99999999999999999999', null],
    ['/dashboard/feed/abc', null],
    ['/dashboard/feed/-4', null],
    ['/dashboard/feed/1e3', null],
    ['/dashboard/feed/0x10', null],
    ['/dashboard/feed', null],
    ['/dashboard/feed/5/comments', null],
    ['/x/dashboard/feed/5', null],
    [null, null],
    [undefined, null],
  ];

  it.each(CASES)('%j → %j', (pathname, expected) => {
    expect(paramsFor(pathname).feedPostIdFromPath).toBe(expected);
  });
});

describe('konverzácia v správach', () => {
  const FROM_PATH: Array<[Pathname, number | null]> = [
    ['/dashboard/messages/7', 7],
    ['/dashboard/messages/7/', 7],
    ['/dashboard/messages/0', 0],
    ['/dashboard/messages', null],
    ['/dashboard/messages/', null],
    ['/dashboard/messages/abc', null],
    ['/dashboard/messages/7/extra', null],
    ['/x/dashboard/messages/7', null],
    [null, null],
    [undefined, null],
  ];

  it.each(FROM_PATH)('z cesty %j → %j', (pathname, expected) => {
    expect(paramsFor(pathname).selectedConversationId).toBe(expected);
  });

  const FROM_QUERY: Array<[string, number | null]> = [
    ['conversationId=9', 9],
    ['conversationId=0', null],
    ['conversationId=-1', null],
    ['conversationId=1.5', null],
    ['conversationId=abc', null],
    ['conversationId=', null],
    ['targetUserId=9', null],
    ['', null],
  ];

  it.each(FROM_QUERY)('z query "%s" → %j', (query, expected) => {
    expect(paramsFor('/dashboard/messages', new URLSearchParams(query)).selectedConversationId).toBe(
      expected,
    );
  });

  it('query má prednosť pred cestou', () => {
    const search = new URLSearchParams('conversationId=9');
    expect(paramsFor('/dashboard/messages/7', search).selectedConversationId).toBe(9);
  });

  it.each(['conversationId=abc', 'conversationId=0', 'conversationId='])(
    'neplatná query "%s" sa preskočí a použije sa cesta',
    (query) => {
      expect(
        paramsFor('/dashboard/messages/7', new URLSearchParams(query)).selectedConversationId,
      ).toBe(7);
    },
  );

  it('hook nekontroluje modul: query platí aj mimo správ', () => {
    const search = new URLSearchParams('conversationId=9');
    expect(paramsFor('/dashboard', search).selectedConversationId).toBe(9);
  });

  it.each([[null], [undefined]])('bez query (%s) ostáva len cesta', (search) => {
    expect(paramsFor('/dashboard/messages/7', search).selectedConversationId).toBe(7);
    expect(paramsFor('/dashboard/messages', search).selectedConversationId).toBeNull();
  });
});

describe('cieľový používateľ správ z query', () => {
  const CASES: Array<[string, number | null]> = [
    ['targetUserId=5', 5],
    ['targetUserId=0', null],
    ['targetUserId=-2', null],
    ['targetUserId=2.5', null],
    ['targetUserId=abc', null],
    ['targetUserId=', null],
    ['conversationId=5', null],
    ['', null],
  ];

  it.each(CASES)('query "%s" → %j', (query, expected) => {
    const values = paramsFor('/dashboard/messages', new URLSearchParams(query));
    expect(values.targetUserIdFromMessagesQuery).toBe(expected);
  });

  it('nezávisí od ID konverzácie', () => {
    const values = paramsFor('/dashboard/messages/7', new URLSearchParams('targetUserId=5'));
    expect(values.targetUserIdFromMessagesQuery).toBe(5);
    expect(values.selectedConversationId).toBe(7);
  });

  it.each([[null], [undefined]])('bez query (%s) je null', (search) => {
    expect(paramsFor('/dashboard/messages', search).targetUserIdFromMessagesQuery).toBeNull();
  });
});

describe('detail portfólia z adresy', () => {
  const CASES: Array<[Pathname, string | null, number | null]> = [
    ['/dashboard/users/jana-novak-1/portfolio/42', 'jana-novak-1', 42],
    ['/dashboard/users/jana-novak-1/portfolio/42/', 'jana-novak-1', 42],
    ['/dashboard/users/17/portfolio/42', '17', 42],
    ['/dashboard/users/jana%20novak/portfolio/42', 'jana novak', 42],
    ['/dashboard/users/%C5%A1tefan/portfolio/42', 'štefan', 42],
    ['/dashboard/users/100%25/portfolio/42', '100%', 42],
    ['/dashboard/users/a%40b/portfolio/42', 'a@b', 42],
    ['/dashboard/users/jana/portfolio/007', 'jana', 7],
    ['/dashboard/users/jana/portfolio/0', 'jana', 0],
    ['/dashboard/users/jana/portfolio/abc', null, null],
    ['/dashboard/users/jana/portfolio/create', null, null],
    ['/dashboard/users/jana/portfolio', null, null],
    ['/dashboard/users/jana/portfolio/', null, null],
    ['/x/dashboard/users/jana/portfolio/42', null, null],
    ['/dashboard/users/jana/portfolio/42/gallery', null, null],
    ['/dashboard/users//portfolio/42', null, null],
    ['/dashboard/users/jana/extra/portfolio/42', null, null],
    ['/dashboard/users/jana', null, null],
    ['/dashboard/portfolio/42', null, null],
    [null, null, null],
    [undefined, null, null],
  ];

  it.each(CASES)('%j → vlastník %j, položka %j', (pathname, owner, item) => {
    const values = paramsFor(pathname);
    expect(values.portfolioOwnerIdentifierFromPath).toBe(owner);
    expect(values.portfolioItemIdFromPath).toBe(item);
  });
});

describe('vytvorenie portfólia z adresy', () => {
  const CASES: Array<[Pathname, string | null]> = [
    ['/dashboard/users/jana-novak-1/portfolio/create', 'jana-novak-1'],
    ['/dashboard/users/jana-novak-1/portfolio/create/', 'jana-novak-1'],
    ['/dashboard/users/jana%20novak/portfolio/create', 'jana novak'],
    ['/dashboard/users/%C5%A1tefan/portfolio/create', 'štefan'],
    ['/dashboard/users/100%25/portfolio/create', '100%'],
    ['/dashboard/users/a%40b/portfolio/create', 'a@b'],
    ['/dashboard/users/jana/portfolio/create/extra', null],
    ['/dashboard/users/jana/extra/portfolio/create', null],
    ['/x/dashboard/users/jana/portfolio/create', null],
    ['/dashboard/users/jana/portfolio/42', null],
    ['/dashboard/users//portfolio/create', null],
    ['/dashboard/users/jana/portfolio', null],
    [null, null],
    [undefined, null],
  ];

  it.each(CASES)('%j → vlastník %j', (pathname, owner) => {
    const values = paramsFor(pathname);
    expect(values.portfolioCreateOwnerIdentifierFromPath).toBe(owner);
    expect(values.portfolioCreateMatch === null).toBe(owner === null);
  });

  it('zhoda nesie identifikátor z adresy tak, ako je v adrese (nedekódovaný)', () => {
    const { portfolioCreateMatch } = paramsFor('/dashboard/users/jana%20novak/portfolio/create');
    expect(portfolioCreateMatch?.[1]).toBe('jana%20novak');
  });

  it.each([['/dashboard/users/jana/portfolio/42'], ['/dashboard'], [null], [undefined]])(
    'bez zhody (%j) je to presne null, nie undefined',
    (pathname) => {
      expect(paramsFor(pathname).portfolioCreateMatch).toBeNull();
    },
  );
});

describe('neplatné percentové kódovanie v adrese', () => {
  // Chybné kódovanie sa nesmie zmeniť na výnimku pri vykresľovaní: vlastník je null (rovnako ako
  // decodeIdentifier v dashboardRoutes), ostatné hodnoty z adresy ostávajú.
  const MALFORMED_SEGMENTS = ['%E0%A4%A', '%', '%zz', '%FF', 'jana%'];

  it.each(MALFORMED_SEGMENTS)('detail portfólia (%s): vlastník je null, položka ostáva', (segment) => {
    const values = paramsFor(`/dashboard/users/${segment}/portfolio/42`);
    expect(values.portfolioOwnerIdentifierFromPath).toBeNull();
    expect(values.portfolioItemIdFromPath).toBe(42);
  });

  it.each(MALFORMED_SEGMENTS)('vytvorenie portfólia (%s): vlastník je null, zhoda ostáva', (segment) => {
    const values = paramsFor(`/dashboard/users/${segment}/portfolio/create`);
    expect(values.portfolioCreateOwnerIdentifierFromPath).toBeNull();
    expect(values.portfolioCreateMatch?.[1]).toBe(segment);
  });

  it('ostatné hodnoty hooku ostávajú dostupné', () => {
    const values = paramsFor(
      '/dashboard/users/%E0%A4%A/portfolio/42',
      new URLSearchParams('conversationId=9&targetUserId=5'),
    );
    expect(values).toMatchObject({
      portfolioOwnerIdentifierFromPath: null,
      portfolioItemIdFromPath: 42,
      selectedConversationId: 9,
      targetUserIdFromMessagesQuery: 5,
    });
  });
});

describe('prepočet pri zmene vstupov', () => {
  const PATH_CHANGES: Array<[string, Pathname, Pathname, (v: ReturnType<typeof paramsFor>) => unknown, unknown, unknown]> = [
    [
      'offerIdFromReviewsPath',
      '/dashboard/offers/1/reviews',
      '/dashboard/offers/2/reviews',
      (v) => v.offerIdFromReviewsPath,
      1,
      2,
    ],
    [
      'feedPostIdFromPath',
      '/dashboard/feed/1',
      '/dashboard/feed/2',
      (v) => v.feedPostIdFromPath,
      1,
      2,
    ],
    [
      'selectedConversationId (z cesty)',
      '/dashboard/messages/1',
      '/dashboard/messages/2',
      (v) => v.selectedConversationId,
      1,
      2,
    ],
    [
      'portfolioOwnerIdentifierFromPath',
      '/dashboard/users/a/portfolio/1',
      '/dashboard/users/b/portfolio/1',
      (v) => v.portfolioOwnerIdentifierFromPath,
      'a',
      'b',
    ],
    [
      'portfolioItemIdFromPath',
      '/dashboard/users/a/portfolio/1',
      '/dashboard/users/a/portfolio/2',
      (v) => v.portfolioItemIdFromPath,
      1,
      2,
    ],
    [
      'portfolioCreateOwnerIdentifierFromPath',
      '/dashboard/users/a/portfolio/create',
      '/dashboard/users/b/portfolio/create',
      (v) => v.portfolioCreateOwnerIdentifierFromPath,
      'a',
      'b',
    ],
  ];

  it.each(PATH_CHANGES)('zmena cesty premietne %s', (_name, before, after, pick, valueBefore, valueAfter) => {
    const view = renderHook(
      ({ pathname }: { pathname: Pathname }) =>
        useDashboardRouteParams(pathname, new URLSearchParams()),
      { initialProps: { pathname: before } },
    );
    expect(pick(view.result.current)).toBe(valueBefore);

    view.rerender({ pathname: after });
    expect(pick(view.result.current)).toBe(valueAfter);
  });

  it('zmena query premietne ID konverzácie aj ID cieľového používateľa', () => {
    const view = renderHook(
      ({ search }: { search: Search }) => useDashboardRouteParams('/dashboard/messages', search),
      { initialProps: { search: new URLSearchParams('conversationId=5&targetUserId=1') } },
    );
    expect(view.result.current.selectedConversationId).toBe(5);
    expect(view.result.current.targetUserIdFromMessagesQuery).toBe(1);

    view.rerender({ search: new URLSearchParams('conversationId=6&targetUserId=2') });
    expect(view.result.current.selectedConversationId).toBe(6);
    expect(view.result.current.targetUserIdFromMessagesQuery).toBe(2);
  });
});

describe('stabilita výsledkov medzi vykresleniami', () => {
  it('portfolioCreateMatch drží identitu, kým sa nezmení cesta (nová query ju nemení)', () => {
    const view = renderHook(
      ({ pathname, search }: { pathname: string; search: Search }) =>
        useDashboardRouteParams(pathname, search),
      {
        initialProps: {
          pathname: '/dashboard/users/jana/portfolio/create',
          search: new URLSearchParams(),
        },
      },
    );
    const first = view.result.current.portfolioCreateMatch;
    expect(first).not.toBeNull();

    view.rerender({
      pathname: '/dashboard/users/jana/portfolio/create',
      search: new URLSearchParams('x=1'),
    });
    expect(view.result.current.portfolioCreateMatch).toBe(first);

    view.rerender({
      pathname: '/dashboard/users/jana/portfolio/create/',
      search: new URLSearchParams('x=1'),
    });
    expect(view.result.current.portfolioCreateMatch).not.toBe(first);
  });

  it('hodnoty z query sa čítajú len pri novom objekte query, nie pri zmene cesty', () => {
    const get = jest.fn((name: string) => (name === 'conversationId' ? '9' : null));
    const search = { get };
    const view = renderHook(
      ({ pathname, sp }: { pathname: string; sp: { get: typeof get } }) =>
        useDashboardRouteParams(pathname, sp),
      { initialProps: { pathname: '/dashboard/messages', sp: search } },
    );
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith('conversationId');
    expect(get).toHaveBeenCalledWith('targetUserId');

    view.rerender({ pathname: '/dashboard/messages/', sp: search });
    expect(get).toHaveBeenCalledTimes(2);

    view.rerender({ pathname: '/dashboard/messages/', sp: { get } });
    expect(get).toHaveBeenCalledTimes(4);
  });
});

describe('výsledok', () => {
  it('vracia presne osem hodnôt', () => {
    expect(Object.keys(paramsFor('/dashboard')).sort()).toEqual([
      'feedPostIdFromPath',
      'offerIdFromReviewsPath',
      'portfolioCreateMatch',
      'portfolioCreateOwnerIdentifierFromPath',
      'portfolioItemIdFromPath',
      'portfolioOwnerIdentifierFromPath',
      'selectedConversationId',
      'targetUserIdFromMessagesQuery',
    ]);
  });

  it('adresa mimo všetkých vzorov nevyplní nič (všetko null)', () => {
    expect(paramsFor('/dashboard/home')).toEqual({
      offerIdFromReviewsPath: null,
      feedPostIdFromPath: null,
      portfolioOwnerIdentifierFromPath: null,
      portfolioItemIdFromPath: null,
      portfolioCreateMatch: null,
      portfolioCreateOwnerIdentifierFromPath: null,
      targetUserIdFromMessagesQuery: null,
      selectedConversationId: null,
    });
  });
});
