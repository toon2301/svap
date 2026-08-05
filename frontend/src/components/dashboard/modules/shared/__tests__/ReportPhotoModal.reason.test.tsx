import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReportPhotoModal } from '../ReportPhotoModal';

const mockPost = jest.fn();

jest.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  endpoints: {
    skills: {
      reportImage: (skillId: number, imageId: number) =>
        `/auth/skills/${skillId}/images/${imageId}/report/`,
    },
    users: {
      reportAvatar: (userId: number) => `/auth/users/${userId}/avatar/report/`,
    },
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const offerImageTarget = {
  type: 'offer_image' as const,
  skillId: 3,
  imageId: 9,
};

describe('ReportPhotoModal – dôvod nahlásenia', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: {} });
  });

  it('sends the stable reason code for offer images', async () => {
    render(
      <ReportPhotoModal open target={offerImageTarget} onClose={jest.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Odoslat' }));

    expect(mockPost).toHaveBeenCalledWith('/auth/skills/3/images/9/report/', {
      reason: 'inappropriate',
      description: undefined,
    });
  });

  it('sends the stable reason code for user avatars', async () => {
    render(
      <ReportPhotoModal
        open
        target={{ type: 'user_avatar', userId: 42 }}
        onClose={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Odoslat' }));

    expect(mockPost).toHaveBeenCalledWith('/auth/users/42/avatar/report/', {
      reason: 'inappropriate',
      description: undefined,
    });
  });

  it('keeps the localized label for display only', async () => {
    render(
      <ReportPhotoModal open target={offerImageTarget} onClose={jest.fn()} />,
    );

    expect(screen.getByText('Nevhodny obsah')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Odoslat' }));

    const [, payload] = mockPost.mock.calls[0];
    expect(payload.reason).toBe('inappropriate');
    expect(payload.reason).not.toBe('Nevhodny obsah');
  });

  it('sends the selected reason code after switching options', async () => {
    render(
      <ReportPhotoModal open target={offerImageTarget} onClose={jest.fn()} />,
    );

    await userEvent.click(screen.getByLabelText('Dovod nahlasenia'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Falosna alebo zavadzajuca fotka' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Odoslat' }));

    expect(mockPost.mock.calls[0][1].reason).toBe('fake');
  });
});
