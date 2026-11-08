/** @jest-environment node */

import { renderToString } from 'react-dom/server';

import BlockedUsersModule from './BlockedUsersModule';

jest.mock('./userBlocksApi', () => ({
  fetchBlockedUsers: jest.fn(),
  unblockUser: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (key: string) =>
      ({
        'blockedUsers.loading': 'Načítavam...',
        'blockedUsers.emptyTitle': 'Nemáte nikoho zablokovaného',
        'blockedUsers.loadFailed': 'Načítanie zlyhalo.',
      })[key] ?? key,
  }),
}));

/**
 * Prvý snímok sekcie Blokované (nález 286). Server-render nespúšťa efekty, takže ukáže presne to, čo sa vykreslí
 * pred prvým načítaním údajov. Tam nesmie byť prázdny stav ani chyba, ale neviditeľná kostra, ktorá drží miesto.
 */
describe('BlockedUsersModule: prvý snímok pred spustením efektov', () => {
  it('vykreslí neviditeľnú kostru a nie prázdny stav ani chybu', () => {
    expect(typeof window).toBe('undefined');

    const html = renderToString(<BlockedUsersModule />);

    expect(html).toContain('blocked-users-loading');
    expect(html).toContain('blocked-users-skeleton');
    expect(html).toContain('data-visible="false"');
    expect(html).toContain('invisible');
    expect(html).not.toContain('Nemáte nikoho zablokovaného');
    expect(html).not.toContain('Načítanie zlyhalo.');
    expect(html).not.toContain('blocked-users-list');
  });
});
