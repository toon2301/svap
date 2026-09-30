/**
 * Po uložení profilu sa scroll editačného formulára NESMIE preniesť do profilu
 * na mobile.
 *
 * `handleSave` si pred prepnutím obrazovky zapamätá `scrollTop` kontajnera
 * `[data-dashboard-main]` a po `onEditCancel` ho niekoľko desiatok ms obnovuje.
 * Na desktope to dáva zmysel (úprava aj profil sú jedno rozloženie). Na mobile je
 * formulár samostatná obrazovka s tlačidlom „Uložiť" úplne dole, takže obnovená
 * pozícia hodila otvorený profil hlboko pod jeho začiatok.
 *
 * Obnova navyše smie písať len do `<main>`, z ktorého scroll prečítala: ak sa
 * obrazovka počas uloženia vymenila (napr. prechod desktop → mobil), `isMobile`
 * zachytené pri kliku už neplatí, no nový `<main>` má vlastnú pozíciu.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { User } from '@/types';
import ProfileModule from '../ProfileModule';

const patchMock = jest.fn();
let mockIsMobile = false;

interface MockProfileViewProps {
  editableUser?: User | null;
  isEditMode?: boolean;
  onEditSave?: (user?: User) => void | Promise<void>;
}

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  api: { patch: (...args: unknown[]) => patchMock(...args) },
}));

jest.mock('@/hooks', () => ({
  ...jest.requireActual('@/hooks'),
  useIsMobile: () => mockIsMobile,
}));

function MockProfileView({ editableUser, isEditMode, onEditSave }: MockProfileViewProps) {
  return isEditMode && editableUser ? (
    <button type="button" onClick={() => onEditSave?.(editableUser)}>
      Save
    </button>
  ) : (
    <div>Profile</div>
  );
}

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: (props: MockProfileViewProps) => <MockProfileView {...props} />,
}));

jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: (props: MockProfileViewProps) => <MockProfileView {...props} />,
}));

jest.mock('../profile/ProfileAvatarActionsModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../profile/ProfileWebsitesModal', () => ({ __esModule: true, default: () => null }));

const baseUser: User = {
  id: 4,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  bio: 'Original bio',
  location: 'Bratislava',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 50,
};

const savedUser: User = { ...baseUser, first_name: 'Updated', updated_at: '2024-01-01T00:00:00Z' };

/** `<main data-dashboard-main>` s pozíciou scrollu, do ktorej sa dá zapisovať a ktorú vidno zápisy. */
function installScrollableMain(initialScrollTop: number) {
  const main = document.createElement('main');
  main.setAttribute('data-dashboard-main', '');
  document.body.appendChild(main);

  let current = initialScrollTop;
  const writes: number[] = [];
  Object.defineProperty(main, 'scrollTop', {
    configurable: true,
    get: () => current,
    set: (value: number) => {
      writes.push(value);
      current = value;
    },
  });

  return {
    main,
    writes,
    /** Prehliadač po výmene obsahu scroll vynuluje sám, nie zápisom z JavaScriptu. */
    browserResetsScroll: () => {
      current = 0;
    },
  };
}

async function saveFromScrolledForm(scrollTop: number) {
  const scroller = installScrollableMain(scrollTop);
  patchMock.mockResolvedValue({ data: { user: savedUser } });
  const onEditCancel = jest.fn(() => scroller.browserResetsScroll());

  render(
    <ProfileModule user={baseUser} isEditMode onUserUpdate={jest.fn()} onEditCancel={onEditCancel} />,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onEditCancel).toHaveBeenCalledWith(savedUser));

  return scroller;
}

/**
 * Obnova beží do ~150 ms (dva rAF a dva timeouty, ktoré si `<main>` hľadajú
 * znova). Počkáme dlhšie, aby po teste nezostal časovač zapisujúci do `<main>`
 * nasledujúceho testu.
 */
async function waitOutRestoreWindow() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

describe('ProfileModule: scroll po uložení profilu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMobile = false;
  });

  afterEach(() => {
    document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
  });

  it('desktop: pozícia scrollu sa po uložení obnoví (pôvodné správanie)', async () => {
    const { main, writes } = await saveFromScrolledForm(640);
    await waitOutRestoreWindow();

    expect(main.scrollTop).toBe(640);
    expect(writes).toContain(640);
  });

  it('mobil: scroll formulára sa do profilu nepreberá – nič sa nezapíše', async () => {
    mockIsMobile = true;
    const { main, writes } = await saveFromScrolledForm(1240);
    await waitOutRestoreWindow();

    expect(writes).toEqual([]);
    expect(main.scrollTop).toBe(0);
  });

  it('obrazovka sa počas uloženia vymenila (nový <main>): jeho scroll sa do profilu nepreberá', async () => {
    const form = installScrollableMain(1240);
    const replacements: Array<ReturnType<typeof installScrollableMain>> = [];
    const onEditCancel = jest.fn(() => {
      form.main.remove();
      replacements.push(installScrollableMain(0));
    });
    patchMock.mockResolvedValue({ data: { user: savedUser } });

    render(
      <ProfileModule user={baseUser} isEditMode onUserUpdate={jest.fn()} onEditCancel={onEditCancel} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onEditCancel).toHaveBeenCalledWith(savedUser));
    await waitOutRestoreWindow();

    expect(replacements).toHaveLength(1);
    expect(replacements[0].writes).toEqual([]);
    expect(replacements[0].main.scrollTop).toBe(0);
  });
});
