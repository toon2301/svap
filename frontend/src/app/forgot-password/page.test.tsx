import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from '@/lib/api';

import ForgotPasswordPage from './page';

jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock('@/components/ParticlesBackground', () => ({
  __esModule: true,
  default: () => null,
}));

const mockApiPost = api.post as jest.MockedFunction<typeof api.post>;

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockApiPost.mockReset();
  });

  it('validates an empty email without calling the API', () => {
    render(<ForgotPasswordPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Odoslať email' }));

    expect(screen.getByText('Email je povinný')).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('shows a neutral success message and sends a normalized email', async () => {
    mockApiPost.mockResolvedValueOnce({ status: 200 } as never);
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Emailová adresa'), {
      target: { value: '  RESET@EXAMPLE.COM  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Odoslať email' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Žiadosť prijatá' })).toBeInTheDocument();
    });
    expect(mockApiPost).toHaveBeenCalledWith('/auth/password-reset/', {
      email: 'RESET@EXAMPLE.COM',
    });
    expect(
      screen.getByText(
        'Ak s touto emailovou adresou existuje aktívny účet, pošleme na ňu odkaz na reset hesla.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Email pre reset hesla bol odoslaný!')).not.toBeInTheDocument();
  });

  it('restores the form after a request error', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Emailová adresa'), {
      target: { value: 'reset@example.com' },
    });
    const submitButton = screen.getByRole('button', { name: 'Odoslať email' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Chyba pri odosielaní emailu pre reset hesla')).toBeInTheDocument();
    });
    expect(submitButton).toBeEnabled();
    consoleError.mockRestore();
  });
});
