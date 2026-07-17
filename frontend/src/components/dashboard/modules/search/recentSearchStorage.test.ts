import { removeUserFromRecentSearches } from './recentSearchStorage';

describe('removeUserFromRecentSearches', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('removes only the hidden user and their offers from stored results', () => {
    window.localStorage.setItem(
      'searchRecentResults_7',
      JSON.stringify([
        {
          users: [
            { id: 42, display_name: 'Blocked' },
            { id: 8, display_name: 'Visible' },
          ],
          skills: [
            { id: 1, user_id: 42, category: 'Blocked offer' },
            { id: 2, user_id: 8, category: 'Visible offer' },
          ],
        },
        {
          users: [{ id: 42, display_name: 'Blocked' }],
          skills: [],
        },
      ]),
    );

    removeUserFromRecentSearches(7, 42);

    expect(JSON.parse(window.localStorage.getItem('searchRecentResults_7') || '[]')).toEqual([
      {
        users: [{ id: 8, display_name: 'Visible' }],
        skills: [{ id: 2, user_id: 8, category: 'Visible offer' }],
      },
    ]);
  });

  it('removes malformed history instead of keeping stale data', () => {
    window.localStorage.setItem('searchRecentResults_7', 'invalid-json');

    removeUserFromRecentSearches(7, 42);

    expect(window.localStorage.getItem('searchRecentResults_7')).toBeNull();
  });
});
