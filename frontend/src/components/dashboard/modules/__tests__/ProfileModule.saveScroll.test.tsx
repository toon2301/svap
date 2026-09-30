/**
 * Po uložení profilu sa scroll editačného formulára NESMIE preniesť do profilu.
 *
 * „Upraviť profil" je samostatná obrazovka (mobil aj desktop) s tlačidlom
 * „Uložiť" úplne dole, takže by obnovená pozícia hodila otvorený profil hlboko
 * pod jeho začiatok. Profil sa po uložení otvára v novom `<main>` od začiatku
 * (viď `useDashboardMainKey`), preto `handleSave` do `[data-dashboard-main]`
 * nepíše vôbec.
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

/** Dlhšie než okno (~150 ms), v ktorom staršia obnova dopisovala scroll – zachytí aj oneskorený zápis. */
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

  it.each([
    ['desktop', false],
    ['mobil', true],
  ])('%s: scroll formulára sa do profilu nepreberá – nič sa nezapíše', async (_viewport, isMobile) => {
    mockIsMobile = isMobile;
    const { main, writes } = await saveFromScrolledForm(1240);
    await waitOutRestoreWindow();

    expect(writes).toEqual([]);
    expect(main.scrollTop).toBe(0);
  });
});
