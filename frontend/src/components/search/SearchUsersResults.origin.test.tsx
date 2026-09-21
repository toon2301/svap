/**
 * Klik na výsledok na stránke `/search` musí profilu odovzdať pôvod.
 *
 * Stránka mala vlastnú kópiu profilovej navigácie, takže značenie pôvodu, čo
 * dostala dashboardová vetva, sa na ňu nedostalo – appková šípka potom profil
 * neopustila, len prepla záložku. Test ide cez skutočný komponent výsledkov,
 * nie cez zdieľanú funkciu: práve na jej ZAPOJENÍ tá chyba vznikla.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchUsersResults } from './SearchUsersResults';
import {
  adoptProfileOrigin,
  readProfileOriginDepth,
  resetProfileOriginPending,
} from '@/components/dashboard/modules/profile/profileOriginHistory';

const pushMock = jest.fn((url: string) => window.history.pushState(null, '', url));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? '' }),
}));

jest.mock('@/components/shared/VerifiedBadge', () => ({
  __esModule: true,
  default: () => null,
}));

const users = [
  { id: 42, display_name: 'Jana Nováková', slug: 'jana', user_type: 'individual' },
];

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileOriginPending();
  window.history.replaceState(null, '', '/search');
});

describe('výsledky vyhľadávania odovzdávajú pôvod', () => {
  it('klik otvorí profil a jeho záznam pozná pôvod', () => {
    render(<SearchUsersResults users={users} title="Ľudia" currentUserId={7} />);

    fireEvent.click(screen.getByText('Jana Nováková'));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/users/jana');
    // Prevzatie prebehne po príchode na profil – rovnako ako v appke.
    adoptProfileOrigin();
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('klávesnica robí to isté čo klik', () => {
    render(<SearchUsersResults users={users} title="Ľudia" currentUserId={7} />);

    fireEvent.keyDown(screen.getByText('Jana Nováková'), { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith('/dashboard/users/jana');
    adoptProfileOrigin();
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });
});
