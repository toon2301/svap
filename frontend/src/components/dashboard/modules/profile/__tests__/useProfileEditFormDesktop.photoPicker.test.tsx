/**
 * Desktopový formulár úpravy profilu: výber fotky cez vstup, ktorý žije v DOM (iOS, nález 201).
 */

import { act, renderHook } from '@testing-library/react';
import type { User } from '@/types';
import { useProfileEditFormDesktop } from '../useProfileEditFormDesktop';

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

function renderForm(onPhotoUpload?: (file: File) => void) {
  return renderHook(() =>
    useProfileEditFormDesktop({
      user,
      editableUser: user,
      accountType: 'personal',
      onEditableUserUpdate: jest.fn(),
      onPhotoUpload,
    }),
  );
}

describe('useProfileEditFormDesktop – výber fotky', () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    pickerInputs().forEach((input) => input.remove());
    clickSpy.mockRestore();
  });

  it('opens a picker whose input stays in the document and hands the chosen photo to the upload handler', () => {
    const onPhotoUpload = jest.fn();
    const { result } = renderForm(onPhotoUpload);

    act(() => result.current.handlePhotoUploadClick());

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(pickerInputs()).toHaveLength(1);
    expect(pickerInputs()[0].isConnected).toBe(true);

    const file = new File([new Uint8Array([1, 2, 3])], 'IMG_9.jpg', { type: 'image/jpeg' });
    Object.defineProperty(pickerInputs()[0], 'files', { value: [file], configurable: true });
    pickerInputs()[0].dispatchEvent(new Event('change'));

    expect(onPhotoUpload).toHaveBeenCalledTimes(1);
    expect(onPhotoUpload.mock.calls[0][0] === file).toBe(true);
    expect(pickerInputs()).toHaveLength(0);
  });

  it('does not fail when the form has no upload handler', () => {
    const { result } = renderForm();

    act(() => result.current.handlePhotoUploadClick());
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
    Object.defineProperty(pickerInputs()[0], 'files', { value: [file], configurable: true });

    expect(() => pickerInputs()[0].dispatchEvent(new Event('change'))).not.toThrow();
    expect(pickerInputs()).toHaveLength(0);
  });
});
