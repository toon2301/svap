/**
 * Modal „Zmeniť fotku“: výber súboru musí žiť v DOM (iOS), inak sa po výbere fotky nestane nič (nález 201).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { User } from '@/types';
import ProfileAvatarActionsModal from '../ProfileAvatarActionsModal';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, locale: 'sk' }),
}));

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

function pickerInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"][data-image-picker]'));
}

describe('ProfileAvatarActionsModal – zmena fotky', () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    pickerInputs().forEach((input) => input.remove());
    clickSpy.mockRestore();
  });

  function renderModal() {
    const onClose = jest.fn();
    const onPhotoUpload = jest.fn();
    const view = render(
      <ProfileAvatarActionsModal
        open
        user={user}
        isUploading={false}
        onClose={onClose}
        onPhotoUpload={onPhotoUpload}
        onRemoveAvatar={jest.fn()}
      />,
    );
    return { ...view, onClose, onPhotoUpload };
  }

  it('opens the picker with an input that stays in the document after the modal closes', () => {
    const { onClose, unmount } = renderModal();

    fireEvent.click(screen.getByText('profile.changePhoto'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    unmount();
    expect(pickerInputs()).toHaveLength(1);
    expect(pickerInputs()[0].isConnected).toBe(true);
  });

  it('passes the chosen photo to the upload handler', () => {
    const { onPhotoUpload } = renderModal();
    fireEvent.click(screen.getByText('profile.changePhoto'));
    const [input] = pickerInputs();
    const file = new File([new Uint8Array([1, 2, 3])], 'image.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(onPhotoUpload).toHaveBeenCalledTimes(1);
    expect(onPhotoUpload.mock.calls[0][0] === file).toBe(true);
    expect(pickerInputs()).toHaveLength(0);
  });
});
