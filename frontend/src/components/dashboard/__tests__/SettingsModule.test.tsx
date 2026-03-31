import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import SettingsModule from '../modules/SettingsModule';
import { User } from '@/types';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  endpoints: {
    push: {
      preferences: '/auth/push/preferences/',
    },
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 75,
};

async function renderSettingsModule() {
  const { api } = require('@/lib/api');
  render(<SettingsModule user={mockUser} />);
  await waitFor(() => {
    expect(api.get).toHaveBeenCalledWith('/auth/push/preferences/');
  });
}

describe('SettingsModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        email_notifications: true,
        push_notifications: false,
      },
    });
    api.patch.mockImplementation(async (_url: string, payload: any) => ({
      data: {
        email_notifications:
          typeof payload?.email_notifications === 'boolean'
            ? payload.email_notifications
            : true,
        push_notifications:
          typeof payload?.push_notifications === 'boolean'
            ? payload.push_notifications
            : false,
      },
    }));
  });

  it('renders settings header', async () => {
    await renderSettingsModule();

    expect(screen.getByText('Nastavenia')).toBeInTheDocument();
  });

  it('renders all tab options', async () => {
    await renderSettingsModule();

    expect(screen.getByText('Všeobecné')).toBeInTheDocument();
    expect(screen.getByText('Súkromie')).toBeInTheDocument();
    expect(screen.getByText('Upozornenia')).toBeInTheDocument();
    expect(screen.getByText('Bezpečnosť')).toBeInTheDocument();
    expect(screen.getByText('Účet')).toBeInTheDocument();
  });

  it('shows general tab as active by default', async () => {
    await renderSettingsModule();

    const generalTab = screen.getByText('Všeobecné').closest('button');
    expect(generalTab).toHaveClass('bg-white', 'text-purple-700');
  });

  it('switches tabs when clicked', async () => {
    await renderSettingsModule();

    const privacyTab = screen.getByText('Súkromie');
    fireEvent.click(privacyTab);

    expect(privacyTab.closest('button')).toHaveClass('bg-white', 'text-purple-700');
    expect(screen.getByText('Nastavenia súkromia')).toBeInTheDocument();
  });

  it('renders general settings', async () => {
    await renderSettingsModule();

    expect(screen.getByText('Všeobecné nastavenia')).toBeInTheDocument();
    expect(screen.getByText('Jazyk')).toBeInTheDocument();
    expect(screen.getByText('Časová zóna')).toBeInTheDocument();
    expect(screen.getByText('Téma')).toBeInTheDocument();
  });

  it('renders privacy settings when privacy tab is active', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Súkromie'));

    expect(screen.getByText('Nastavenia súkromia')).toBeInTheDocument();
    expect(screen.getByText('Viditeľnosť profilu')).toBeInTheDocument();
    expect(screen.getByText('Zobraziť email')).toBeInTheDocument();
    expect(screen.getByText('Zobraziť telefón')).toBeInTheDocument();
  });

  it('renders notification settings when notifications tab is active', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Upozornenia'));

    expect(screen.getByRole('heading', { name: 'Upozornenia' })).toBeInTheDocument();
    expect(screen.getByText('Email upozornenia')).toBeInTheDocument();
    expect(screen.getByText('Push upozornenia')).toBeInTheDocument();
  });

  it('renders security settings when security tab is active', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Bezpečnosť'));

    expect(screen.getByRole('heading', { name: 'Bezpečnosť' })).toBeInTheDocument();
    expect(screen.getByText('Dvojfaktorová autentifikácia')).toBeInTheDocument();
    expect(screen.getByText('Zmeniť heslo')).toBeInTheDocument();
  });

  it('renders account settings when account tab is active', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Účet'));

    expect(screen.getByText('Správa účtu')).toBeInTheDocument();
    expect(screen.getByText('Nebezpečná zóna')).toBeInTheDocument();
    expect(screen.getByText('Vymazať účet')).toBeInTheDocument();
  });

  it('updates settings when privacy checkboxes are toggled', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Súkromie'));

    const emailCheckbox = screen.getByLabelText('Zobraziť email');
    fireEvent.click(emailCheckbox);

    expect(emailCheckbox).toBeChecked();
  });

  it('updates settings when selects are changed', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Súkromie'));

    const visibilitySelect = screen.getByDisplayValue('Verejný');
    fireEvent.change(visibilitySelect, { target: { value: 'private' } });

    expect(visibilitySelect).toHaveValue('private');
  });

  it('shows danger zone in account settings', async () => {
    await renderSettingsModule();

    fireEvent.click(screen.getByText('Účet'));

    expect(screen.getByText('Nebezpečná zóna')).toBeInTheDocument();
    expect(
      screen.getByText('Tieto akcie sú nevratné. Buďte opatrní.'),
    ).toBeInTheDocument();
  });

  it('loads persisted notification preferences from the API', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValueOnce({
      data: {
        email_notifications: false,
        push_notifications: true,
      },
    });

    await renderSettingsModule();
    fireEvent.click(screen.getByText('Upozornenia'));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('persists push preference changes through the API', async () => {
    const { api } = require('@/lib/api');

    await renderSettingsModule();
    fireEvent.click(screen.getByText('Upozornenia'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', {
        push_notifications: true,
      });
    });
  });
});
