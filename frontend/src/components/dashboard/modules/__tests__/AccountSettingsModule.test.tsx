import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccountSettingsModule from '../AccountSettingsModule';
import type { User } from '@/types';

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ logout: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { post: jest.fn() },
  endpoints: {
    auth: {
      resendVerification: '/auth/resend-verification/',
      deleteAccount: '/auth/account/delete/',
      requestAccountDeletion: '/auth/account/request-deletion/',
    },
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'tester@example.com',
    first_name: 'Test',
    last_name: 'User',
    is_verified: false,
    has_password: true,
    ...overrides,
  } as User;
}

describe('AccountSettingsModule mobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('shows verify email and delete account options for an unverified user', () => {
    const onMobileViewChange = jest.fn();

    render(
      <AccountSettingsModule
        user={makeUser()}
        mobileView="overview"
        onMobileViewChange={onMobileViewChange}
      />,
    );

    const overview = screen.getByTestId('account-settings-mobile-overview');
    fireEvent.click(within(overview).getByRole('button', { name: /Overi/i }));

    expect(within(overview).getByRole('button', { name: /Zmaza/i })).toBeInTheDocument();
    expect(onMobileViewChange).toHaveBeenCalledWith('verify-email');
  });

  it('hides the verify email option once the user is already verified', () => {
    render(<AccountSettingsModule user={makeUser({ is_verified: true })} mobileView="overview" />);

    const overview = screen.getByTestId('account-settings-mobile-overview');

    expect(within(overview).queryByRole('button', { name: /Overi/i })).not.toBeInTheDocument();
    expect(within(overview).getByRole('button', { name: /Zmaza/i })).toBeInTheDocument();
  });

  it('renders verify email detail without a duplicate inner heading', () => {
    render(<AccountSettingsModule user={makeUser()} mobileView="verify-email" />);

    const detail = screen.getByTestId('account-settings-mobile-detail');

    expect(within(detail).queryByRole('heading', { name: /Over/i })).not.toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /Overi/i })).toBeInTheDocument();
  });

  it('renders delete account detail without a duplicate inner heading', () => {
    render(<AccountSettingsModule user={makeUser()} mobileView="delete-account" />);

    const detail = screen.getByTestId('account-settings-mobile-detail');

    expect(within(detail).queryByRole('heading', { name: /Zmaza/i })).not.toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /Zmaza/i })).toBeInTheDocument();
  });
});
