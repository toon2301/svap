/**
 * Zmena avatara: hlášky pri zlyhaní nahrávania.
 *
 * Z iPhonu (WebKit iOS 26.5+/27) môže fotka na server dorazit s PRÁZDNYM telom; backend vtedy vráti
 * `{ code: 'empty_avatar_upload' }` bez textu. Používateľ nesmie dostať všeobecnú hlášku – dostane
 * jasnú, preloženú správu. Ostatné chyby ostávajú ako doteraz.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import type { User } from '@/types';
import ProfileModule from '../ProfileModule';
import { resetProfileActionLock } from '../profile/useProfileActionLock';

const patchMock = jest.fn();
let uploadPhoto: ((file: File) => void) | undefined;

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

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback, locale: 'sk' }),
}));

interface MockViewProps {
  onPhotoUpload: (file: File) => void;
}

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => {
    uploadPhoto = props.onPhotoUpload;
    return <div>Profile</div>;
  },
}));

jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => {
    uploadPhoto = props.onPhotoUpload;
    return <div>Profile</div>;
  },
}));

jest.mock('../profile/ProfileAvatarActionsModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../profile/ProfileWebsitesModal', () => ({ __esModule: true, default: () => null }));

const user: User = {
  id: 4,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  bio: '',
  location: 'Bratislava',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 50,
};

async function uploadAndWait(): Promise<void> {
  render(<ProfileModule user={user} onUserUpdate={jest.fn()} />);
  await act(async () => {
    uploadPhoto?.(new File([new Uint8Array([1, 2, 3])], 'image.jpg', { type: 'image/jpeg' }));
  });
}

describe('ProfileModule: hlášky pri nahrávaní avatara', () => {
  beforeAll(() => {
    // jsdom nemá `URL.createObjectURL` (modul ním robí okamžitý náhľad avatara).
    Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'blob:preview'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn(), configurable: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    patchMock.mockReset();
    resetProfileActionLock();
    uploadPhoto = undefined;
  });

  it('prázdne telo požiadavky z iPhonu dostane vlastnú hlášku, nie všeobecnú', async () => {
    patchMock.mockRejectedValue({ response: { status: 400, data: { code: 'empty_avatar_upload' } } });

    await uploadAndWait();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Fotka sa nedostala na server. Skúste ju nahrať znova.'),
    );
  });

  it('dôvod odmietnutia od servera sa ukáže tak, ako doteraz', async () => {
    patchMock.mockRejectedValue({
      response: { status: 400, data: { validation_errors: { avatar: ['Obrázok je príliš veľký.'] } } },
    });

    await uploadAndWait();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Obrázok je príliš veľký.'));
  });

  it('chyba bez odpovede servera (sieť) ukáže preloženú všeobecnú hlášku', async () => {
    patchMock.mockRejectedValue(new Error('Network Error'));

    await uploadAndWait();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa nahrať fotku. Skús to znova.'),
    );
  });

  it('úspešné nahratie ostáva s potvrdením', async () => {
    patchMock.mockResolvedValue({ data: { user: { ...user, avatar_url: 'https://cdn.test/a.jpg' } } });

    await uploadAndWait();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fotka bola úspešne nahraná!'));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
