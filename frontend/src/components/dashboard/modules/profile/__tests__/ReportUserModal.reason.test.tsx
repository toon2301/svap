import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReportUserModal } from '../ReportUserModal';

const mockPost = jest.fn();

jest.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  endpoints: {
    users: { report: (id: number) => `/auth/users/${id}/report/` },
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

describe('ReportUserModal – dôvod nahlásenia', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: {} });
  });

  it('sends the stable reason code, not the displayed label', async () => {
    render(<ReportUserModal open onClose={jest.fn()} userId={7} />);

    await userEvent.click(screen.getByRole('button', { name: 'Odoslať' }));

    expect(mockPost).toHaveBeenCalledWith('/auth/users/7/report/', {
      reason: 'inappropriate',
      description: undefined,
    });
  });

  it('keeps the localized label for display only', async () => {
    render(<ReportUserModal open onClose={jest.fn()} userId={7} />);

    // Používateľ vidí text, backend dostane kód.
    expect(screen.getByText('Nevhodné správanie')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Odoslať' }));

    const [, payload] = mockPost.mock.calls[0];
    expect(payload.reason).toBe('inappropriate');
    expect(payload.reason).not.toBe('Nevhodné správanie');
  });

  it('sends the selected reason code after switching options', async () => {
    render(<ReportUserModal open onClose={jest.fn()} userId={7} />);

    // Trigger dropdownu je zviazaný s <label>, takže jeho prístupné meno je
    // „Dôvod" – nie text vybranej možnosti.
    await userEvent.click(screen.getByLabelText('Dôvod'));
    await userEvent.click(screen.getByRole('button', { name: 'Falošný profil' }));
    await userEvent.click(screen.getByRole('button', { name: 'Odoslať' }));

    expect(mockPost.mock.calls[0][1].reason).toBe('fake');
  });
});
