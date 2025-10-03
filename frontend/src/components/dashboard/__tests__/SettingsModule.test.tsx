import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsModule from '../modules/SettingsModule';
import { User } from '@/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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

describe('SettingsModule', () => {
  it('renders settings header', () => {
    render(<SettingsModule user={mockUser} />);
    
    expect(screen.getByText('Nastavenia')).toBeInTheDocument();
  });

  it('renders all tab options', () => {
    render(<SettingsModule user={mockUser} />);
    
    expect(screen.getByText('Všeobecné')).toBeInTheDocument();
    expect(screen.getByText('Súkromie')).toBeInTheDocument();
    expect(screen.getByText('Upozornenia')).toBeInTheDocument();
    expect(screen.getByText('Bezpečnosť')).toBeInTheDocument();
    expect(screen.getByText('Účet')).toBeInTheDocument();
  });

  it('shows general tab as active by default', () => {
    render(<SettingsModule user={mockUser} />);
    
    const generalTab = screen.getByText('Všeobecné').closest('button');
    expect(generalTab).toHaveClass('bg-white', 'text-purple-700');
  });

  it('switches tabs when clicked', () => {
    render(<SettingsModule user={mockUser} />);
    
    const privacyTab = screen.getByText('Súkromie');
    fireEvent.click(privacyTab);
    
    expect(privacyTab.closest('button')).toHaveClass('bg-white', 'text-purple-700');
    expect(screen.getByText('Nastavenia súkromia')).toBeInTheDocument();
  });

  it('renders general settings', () => {
    render(<SettingsModule user={mockUser} />);
    
    expect(screen.getByText('Všeobecné nastavenia')).toBeInTheDocument();
    expect(screen.getByText('Jazyk')).toBeInTheDocument();
    expect(screen.getByText('Časová zóna')).toBeInTheDocument();
    expect(screen.getByText('Téma')).toBeInTheDocument();
  });

  it('renders privacy settings when privacy tab is active', () => {
    render(<SettingsModule user={mockUser} />);
    
    const privacyTab = screen.getByText('Súkromie');
    fireEvent.click(privacyTab);
    
    expect(screen.getByText('Nastavenia súkromia')).toBeInTheDocument();
    expect(screen.getByText('Viditeľnosť profilu')).toBeInTheDocument();
    expect(screen.getByText('Zobraziť email')).toBeInTheDocument();
    expect(screen.getByText('Zobraziť telefón')).toBeInTheDocument();
  });

  it('renders notification settings when notifications tab is active', () => {
    render(<SettingsModule user={mockUser} />);
    
    const notificationsTab = screen.getByText('Upozornenia');
    fireEvent.click(notificationsTab);
    
    expect(screen.getByRole('heading', { name: 'Upozornenia' })).toBeInTheDocument();
    expect(screen.getByText('Email upozornenia')).toBeInTheDocument();
    expect(screen.getByText('Push upozornenia')).toBeInTheDocument();
  });

  it('renders security settings when security tab is active', () => {
    render(<SettingsModule user={mockUser} />);
    
    const securityTab = screen.getByText('Bezpečnosť');
    fireEvent.click(securityTab);
    
    expect(screen.getByRole('heading', { name: 'Bezpečnosť' })).toBeInTheDocument();
    expect(screen.getByText('Dvojfaktorová autentifikácia')).toBeInTheDocument();
    expect(screen.getByText('Zmeniť heslo')).toBeInTheDocument();
  });

  it('renders account settings when account tab is active', () => {
    render(<SettingsModule user={mockUser} />);
    
    const accountTab = screen.getByText('Účet');
    fireEvent.click(accountTab);
    
    expect(screen.getByText('Správa účtu')).toBeInTheDocument();
    expect(screen.getByText('Nebezpečná zóna')).toBeInTheDocument();
    expect(screen.getByText('Vymazať účet')).toBeInTheDocument();
  });

  it('updates settings when checkboxes are toggled', () => {
    render(<SettingsModule user={mockUser} />);
    
    const privacyTab = screen.getByText('Súkromie');
    fireEvent.click(privacyTab);
    
    const emailCheckbox = screen.getByLabelText('Zobraziť email');
    fireEvent.click(emailCheckbox);
    
    expect(emailCheckbox).toBeChecked();
  });

  it('updates settings when selects are changed', () => {
    render(<SettingsModule user={mockUser} />);
    
    const privacyTab = screen.getByText('Súkromie');
    fireEvent.click(privacyTab);
    
    const visibilitySelect = screen.getByDisplayValue('Verejný');
    fireEvent.change(visibilitySelect, { target: { value: 'private' } });
    
    expect(visibilitySelect).toHaveValue('private');
  });

  it('shows danger zone in account settings', () => {
    render(<SettingsModule user={mockUser} />);
    
    const accountTab = screen.getByText('Účet');
    fireEvent.click(accountTab);
    
    expect(screen.getByText('Nebezpečná zóna')).toBeInTheDocument();
    expect(screen.getByText('Tieto akcie sú nevratné. Buďte opatrní.')).toBeInTheDocument();
  });
});
