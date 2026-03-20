import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { User } from '@/types';
import ProfileModule from '../ProfileModule';

const patchMock = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: ({ editableUser, isEditMode, onEditSave }: any) =>
    isEditMode && editableUser ? (
      <button type="button" onClick={() => onEditSave?.(editableUser)}>
        Save
      </button>
    ) : (
      <div>Desktop profile</div>
    ),
}));

jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: () => <div>Mobile profile</div>,
}));

jest.mock('../profile/ProfileAvatarActionsModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../profile/ProfileWebsitesModal', () => ({
  __esModule: true,
  default: () => null,
}));

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

describe('ProfileModule save close flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes edit mode with the latest saved user identity after successful save', async () => {
    const onUserUpdate = jest.fn();
    const onEditCancel = jest.fn();
    const savedUser: User = {
      ...baseUser,
      first_name: 'Updated',
      slug: 'updated-user',
      updated_at: '2024-01-01T00:00:00Z',
      profile_completeness: 90,
    };

    patchMock.mockResolvedValue({
      data: {
        user: savedUser,
      },
    });

    render(
      <ProfileModule
        user={baseUser}
        isEditMode
        onUserUpdate={onUserUpdate}
        onEditCancel={onEditCancel}
      />
    );

    const saveButton = await screen.findByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/auth/profile/', expect.any(Object));
    });

    await waitFor(() => {
      expect(onEditCancel).toHaveBeenCalledWith(savedUser);
    });
  });
});
