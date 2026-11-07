/**
 * Zoznam Nastavení na mobile (nález 276, časť Nastavenia): obsah pod panelom.
 *
 * Zoznam je panel, ktorý sa vsúva ZĽAVA ponad obrazovku, z ktorej sa otvoril (profil), alebo na ktorú sa z neho
 * vraciame (sekcia). Pod ním stála zástupná stránka modulu `settings` („Vyber si sekciu z navigácie…“), takže sa pri
 * vsúvaní panela obsah na pravej strane na okamih vymenil za sivý text (preblik, zmerané v prehliadači). Teraz sa pod
 * panelom vykreslí tá istá obrazovka a nevykreslí sa znova. Desktop sa nemení.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { User } from '@/types';

let mockIsMobile = true;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
}));

jest.mock('../modules/HomeModule', () => ({
  __esModule: true,
  default: () => <div data-testid="home-module">HomeModule</div>,
}));
jest.mock('../modules/NotificationsModule', () => ({
  __esModule: true,
  default: () => <div data-testid="notifications-module">NotificationsModule</div>,
}));
jest.mock('../modules/NotificationSettingsModule', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-settings-module">NotificationSettingsModule</div>,
}));
jest.mock('../modules/ProfileModule', () => ({
  __esModule: true,
  default: ({ isEditMode }: { isEditMode?: boolean }) => (
    <div data-testid="profile-module" data-edit={String(Boolean(isEditMode))}>
      ProfileModule
    </div>
  ),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import ModuleRouter from '../ModuleRouter';

const PLACEHOLDER = 'Vyber si sekciu z navigácie pre pokračovanie.';

const mockUser = {
  id: 42,
  username: 'u',
  email: 'u@e.com',
  first_name: 'U',
  last_name: 'U',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '',
  updated_at: '',
  profile_completeness: 50,
} as User;

/** Vlastnosti `ModuleRouter` s no-op funkciami; mení sa len `activeModule`. */
function routerFor(activeModule: string) {
  const noop = jest.fn();
  return (
    <ModuleRouter
      user={mockUser}
      activeModule={activeModule}
      activeRightItem=""
      isRightSidebarOpen={false}
      accountType="personal"
      onUserUpdate={noop}
      handleRightSidebarToggle={noop}
      closeOwnProfileEdit={noop}
      setActiveModule={noop}
      setIsSkillsCategoryModalOpen={noop}
      setSelectedSkillsCategory={noop}
      setIsSkillDescriptionModalOpen={noop}
      setIsAddCustomCategoryModalOpen={noop}
      setEditingCustomCategoryIndex={noop}
      setEditingStandardCategoryIndex={noop}
      standardCategories={[]}
      customCategories={[]}
      setAccountType={noop}
      setIsAccountTypeModalOpen={noop}
      setIsPersonalAccountModalOpen={noop}
      removeStandardCategory={noop}
      removeCustomCategory={noop}
      selectedSkillsCategory={null}
      onEditProfileClick={noop}
      onSkillsOfferClick={noop}
      onManageOfferWatches={noop}
    />
  );
}

beforeEach(() => {
  mockIsMobile = true;
});

describe('ModuleRouter: zoznam Nastavení na mobile drží obrazovku pod panelom', () => {
  it('domov → zoznam Nastavení: pod panelom ostane ten istý obsah, nie zástupná stránka', () => {
    const { rerender } = render(routerFor('home'));
    const home = screen.getByTestId('home-module');

    rerender(routerFor('settings'));

    expect(screen.getByTestId('home-module')).toBe(home);
    expect(screen.queryByText(PLACEHOLDER)).not.toBeInTheDocument();
  });

  it('sekcia → Späť na zoznam: pod panelom ostane sekcia', () => {
    const { rerender } = render(routerFor('notification-settings'));
    const section = screen.getByTestId('notification-settings-module');

    rerender(routerFor('settings'));

    expect(screen.getByTestId('notification-settings-module')).toBe(section);
    expect(screen.queryByText(PLACEHOLDER)).not.toBeInTheDocument();
  });

  it('zoznam → zatvorenie: obrazovka sa nevykreslí znova (ten istý prvok DOM)', () => {
    const { rerender } = render(routerFor('home'));
    const home = screen.getByTestId('home-module');

    rerender(routerFor('settings'));
    rerender(routerFor('home'));

    expect(screen.getByTestId('home-module')).toBe(home);
  });

  it('prekreslenie počas otvoreného zoznamu obsah nezmení', () => {
    const { rerender } = render(routerFor('home'));
    const home = screen.getByTestId('home-module');
    rerender(routerFor('settings'));

    rerender(routerFor('settings'));

    expect(screen.getByTestId('home-module')).toBe(home);
  });

  it('zoznam → iná obrazovka: vykreslí sa tá, nie pôvodná', () => {
    const { rerender } = render(routerFor('home'));

    rerender(routerFor('settings'));
    rerender(routerFor('notifications'));

    expect(screen.getByTestId('notifications-module')).toBeInTheDocument();
    expect(screen.queryByTestId('home-module')).not.toBeInTheDocument();
  });

  it('priamy vstup na zoznam (nie je pod ním žiadna obrazovka): ukáže sa zástupná stránka', () => {
    render(routerFor('settings'));

    expect(screen.getByText(PLACEHOLDER)).toBeInTheDocument();
  });

  it('desktop sa nemení: modul `settings` vykreslí úpravu profilu, nie predošlú obrazovku', () => {
    mockIsMobile = false;
    const { rerender } = render(routerFor('home'));

    rerender(routerFor('settings'));

    expect(screen.queryByTestId('home-module')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-module')).toHaveAttribute('data-edit', 'true');
  });
});
