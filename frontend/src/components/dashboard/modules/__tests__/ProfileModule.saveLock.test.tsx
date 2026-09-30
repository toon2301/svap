/**
 * Zámok akcií nad vlastným profilom prežije prekreslenie `ProfileModule`.
 *
 * `<main>` sa vytvára nanovo pri prepnutí obrazovky (na mobile aj „Upraviť
 * profil") a pri prechode cez breakpoint – `ProfileModule` s ním. Zámok viazaný
 * na inštanciu sa tým uvoľnil, kým predošlé PATCH ešte letelo: nová inštancia
 * mohla poslať druhé uloženie a staršie ho na serveri mohlo predbehnúť (napr.
 * novšiu voľbu viditeľnosti kontaktu prepísal starší snímok).
 */

import React from 'react';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import type { User } from '@/types';
import ProfileModule from '../ProfileModule';
import { resetProfileActionLock } from '../profile/useProfileActionLock';

// Rezerva pre pomalé CI: predvolená 1 s pre `findBy*` je pri vyťaženom stroji tesná.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15000);

const patchMock = jest.fn();

interface MockProfileViewProps {
  editableUser?: User | null;
  isEditMode?: boolean;
  isUploading?: boolean;
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
  useIsMobile: () => false,
}));

function MockProfileView({ editableUser, isEditMode, isUploading, onEditSave }: MockProfileViewProps) {
  return isEditMode && editableUser ? (
    <button type="button" data-uploading={String(Boolean(isUploading))} onClick={() => onEditSave?.(editableUser)}>
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

type PatchResponse = { data: { user: User } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Jedna „inštancia" ProfileModule v režime úpravy – unmount + nový render = prekreslenie `<main>`. */
function renderInstance() {
  const onEditCancel = jest.fn();
  const onUserUpdate = jest.fn();
  const view = render(
    <ProfileModule user={baseUser} isEditMode onUserUpdate={onUserUpdate} onEditCancel={onEditCancel} />,
  );
  return { ...view, onEditCancel, onUserUpdate };
}

async function clickSave() {
  const button = await screen.findByRole('button', { name: 'Save' });
  // Aj hneď vyriešené PATCH sa dokončí ešte v `act`, inak React hlási zmenu stavu mimo neho.
  await act(async () => {
    fireEvent.click(button);
  });
}

describe('ProfileModule: zámok akcií po prekreslení (nový <main>)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    patchMock.mockReset();
    resetProfileActionLock();
  });

  it('nová inštancia počas letiaceho uloženia druhé uloženie neodošle', async () => {
    const pending = deferred<PatchResponse>();
    patchMock.mockReturnValue(pending.promise);

    const first = renderInstance();
    await clickSave();
    expect(patchMock).toHaveBeenCalledTimes(1);

    first.unmount();
    const second = renderInstance();
    await clickSave();

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(second.onEditCancel).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitFor(() => expect(first.onEditCancel).toHaveBeenCalledWith(savedUser));
  });

  it('nová inštancia ukazuje, že akcia beží, kým pôvodné uloženie neskončí', async () => {
    const pending = deferred<PatchResponse>();
    patchMock.mockReturnValue(pending.promise);

    const first = renderInstance();
    await clickSave();
    first.unmount();
    renderInstance();

    expect(await screen.findByRole('button', { name: 'Save' })).toHaveAttribute('data-uploading', 'true');

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-uploading', 'false'),
    );
  });

  it('po dokončení pôvodného uloženia sa zámok uvoľní aj pre novú inštanciu', async () => {
    const pending = deferred<PatchResponse>();
    patchMock.mockReturnValueOnce(pending.promise).mockResolvedValue({ data: { user: savedUser } });

    const first = renderInstance();
    await clickSave();
    first.unmount();
    renderInstance();

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitFor(() => expect(first.onEditCancel).toHaveBeenCalledTimes(1));

    await clickSave();
    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(2));
  });

  it('zlyhanie pôvodného uloženia po prekreslení: rollback prebehne a zámok sa uvoľní', async () => {
    const pending = deferred<PatchResponse>();
    patchMock.mockReturnValueOnce(pending.promise).mockResolvedValue({ data: { user: savedUser } });

    const first = renderInstance();
    await clickSave();
    first.unmount();
    const second = renderInstance();

    await act(async () => {
      pending.reject({ response: { data: { validation_errors: { bio: ['Príliš dlhé.'] } } } });
    });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Príliš dlhé.'));

    const rollback = first.onUserUpdate.mock.calls.at(-1)?.[0] as (prev: User | null) => User | null;
    expect(rollback(null)).toEqual(baseUser);
    expect(first.onEditCancel).not.toHaveBeenCalled();

    await clickSave();
    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(second.onEditCancel).toHaveBeenCalledWith(savedUser));
  });
});
