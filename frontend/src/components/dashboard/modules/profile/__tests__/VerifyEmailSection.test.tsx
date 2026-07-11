import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifyEmailSection from '../VerifyEmailSection';
import { api } from '@/lib/api';
import type { User } from '@/types';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { post: jest.fn() },
  endpoints: { auth: { resendVerification: '/auth/resend-verification/' } },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'oauth-user@example.com',
    first_name: 'O',
    last_name: 'Auth',
    is_verified: false,
    has_password: false,
    ...overrides,
  } as User;
}

describe('VerifyEmailSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    (api.post as jest.Mock).mockResolvedValue({ data: { email_sent: true } });
  });

  it('renders the verify button for an unverified OAuth user', () => {
    render(<VerifyEmailSection user={makeUser()} />);

    expect(screen.getByTestId('verify-email-section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overiť email' })).toBeInTheDocument();
  });

  it('renders for an unverified password account too (manual registration)', () => {
    render(<VerifyEmailSection user={makeUser({ has_password: true })} />);

    expect(screen.getByTestId('verify-email-section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overiť email' })).toBeInTheDocument();
  });

  it('is hidden for an already verified account and clears persisted state', () => {
    window.localStorage.setItem('swaply:verify-email-sent:1', String(Date.now()));

    render(<VerifyEmailSection user={makeUser({ is_verified: true })} />);

    expect(screen.queryByTestId('verify-email-section')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('swaply:verify-email-sent:1')).toBeNull();
  });

  it('sends the verification email and shows the "check your email" message', async () => {
    render(<VerifyEmailSection user={makeUser()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Overiť email' }));

    await waitFor(() => {
      expect(screen.getByTestId('verify-email-sent')).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith('/auth/resend-verification/', {
      email: 'oauth-user@example.com',
    });
    expect(screen.queryByRole('button', { name: 'Overiť email' })).not.toBeInTheDocument();
    // Persistované do localStorage (per user).
    expect(window.localStorage.getItem('swaply:verify-email-sent:1')).not.toBeNull();
  });

  it('keeps the "check your email" state after remount (persisted, within TTL)', () => {
    // Simuluj nedávne odoslanie (pred navigáciou preč) → po opätovnom mounte
    // sa má zobraziť hláška, nie pôvodné tlačidlo.
    window.localStorage.setItem('swaply:verify-email-sent:1', String(Date.now() - 5000));

    render(<VerifyEmailSection user={makeUser()} />);

    expect(screen.getByTestId('verify-email-sent')).toBeInTheDocument();
    expect(screen.getByTestId('verify-email-resend')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Overiť email' })).not.toBeInTheDocument();
  });

  it('reverts to the initial button after the 10-minute TTL expires', () => {
    // Starší než TTL (10 min) → loader ho vyčistí a zobrazí pôvodné tlačidlo.
    window.localStorage.setItem(
      'swaply:verify-email-sent:1',
      String(Date.now() - 11 * 60 * 1000),
    );

    render(<VerifyEmailSection user={makeUser()} />);

    expect(screen.queryByTestId('verify-email-sent')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overiť email' })).toBeInTheDocument();
    expect(window.localStorage.getItem('swaply:verify-email-sent:1')).toBeNull();
  });

  it('disables resend during the 60s cooldown and enables it afterwards', () => {
    jest.useFakeTimers();
    try {
      // Odoslané pred 5 s → cooldown beží, tlačidlo je zablokované s countdownom.
      window.localStorage.setItem('swaply:verify-email-sent:1', String(Date.now() - 5000));
      render(<VerifyEmailSection user={makeUser()} />);

      const resend = screen.getByTestId('verify-email-resend');
      expect(resend).toBeDisabled();
      expect(resend.textContent).toMatch(/\d+/); // countdown "... za X s"

      // Posuň za hranicu cooldownu → tlačidlo aktívne.
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(screen.getByTestId('verify-email-resend')).toBeEnabled();
      expect(screen.getByTestId('verify-email-resend').textContent).toContain('Odoslať znova');
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('keeps the button and shows an error toast when sending fails', async () => {
    const toast = (await import('react-hot-toast')).default;
    (api.post as jest.Mock).mockRejectedValue(new Error('network'));

    render(<VerifyEmailSection user={makeUser()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Overiť email' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(screen.getByRole('button', { name: 'Overiť email' })).toBeInTheDocument();
    expect(window.localStorage.getItem('swaply:verify-email-sent:1')).toBeNull();
  });
});
