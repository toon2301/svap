/**
 * Testy pre RegisterForm komponent
 */
// Mock reCAPTCHA hook MUST be declared before importing the component
jest.mock('react-google-recaptcha-v3', () => ({
  useGoogleReCaptcha: () => ({
    executeRecaptcha: async () => 'test-captcha-token',
  }),
}));
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RegisterForm from '../RegisterForm';
import { api } from '@/lib/api';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
  endpoints: {
    auth: {
      register: '/auth/register/',
    },
  },
}));

// Mock auth utils
jest.mock('@/utils/auth', () => ({
  setAuthTokens: jest.fn(),
}));

const mockPush = jest.fn();
const mockApiPost = api.post as jest.MockedFunction<typeof api.post>;

describe('RegisterForm', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockApiPost.mockClear();
    mockPush.mockClear();
  });

  it('renders registration form correctly', () => {
    const { container } = render(<RegisterForm />);
    
    expect(screen.getByText('Registrácia')).toBeInTheDocument();
    expect(screen.getByLabelText('Používateľské meno *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
    expect(screen.getByLabelText('Heslo *')).toBeInTheDocument();
    expect(screen.getByLabelText('Potvrdenie hesla *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrovať sa' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<RegisterForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Používateľské meno je povinné')).toBeInTheDocument();
      expect(screen.getByText('Email je povinný')).toBeInTheDocument();
      expect(screen.getByText('Heslo je povinné')).toBeInTheDocument();
      expect(screen.getByText('Potvrdenie hesla je povinné')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<RegisterForm />);
    
    const emailInput = screen.getByLabelText('Email *');
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    // Skontroluj, či sa form neodoslal (API sa nevolá)
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    render(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText('Heslo *');
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Heslo musí mať aspoň 8 znakov')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    render(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText('Heslo *');
    const confirmPasswordInput = screen.getByLabelText('Potvrdenie hesla *');
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Heslá sa nezhodujú')).toBeInTheDocument();
    });
  });

  it('validates birth date', async () => {
    const { container } = render(<RegisterForm />);
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    const birth = container.querySelector('#birth_date') as HTMLInputElement;
    // Neplatný deň – nastav 1990-06-32 (pre input sa zapíše ako string, validátor si to rozloží)
    fireEvent.change(birth, { target: { value: '1990-06-32' } });
    fireEvent.click(submitButton);
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('validates age requirement', async () => {
    const { container } = render(<RegisterForm />);
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    const birth = container.querySelector('#birth_date') as HTMLInputElement;
    fireEvent.change(birth, { target: { value: '2020-06-15' } }); // Príliš mladý
    fireEvent.click(submitButton);
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('shows company fields when company type is selected', async () => {
    render(<RegisterForm />);
    const trigger = screen.getByLabelText('Vyberte typ účtu');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Firma' }));

    await waitFor(() => {
      // V company mode sa "username" pole používa ako názov firmy
      expect(screen.getByLabelText('Názov firmy *')).toBeInTheDocument();
    });
  });

  it('validates company name when company type is selected', async () => {
    render(<RegisterForm />);

    const trigger = screen.getByLabelText('Vyberte typ účtu');
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Firma' }));

    // počkaj, kým sa zaktualizuje stav a zobrazí sekcia pre firmu
    await waitFor(() => {
      expect(screen.getByLabelText('Názov firmy *')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Názov firmy je povinný')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    render(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText('Heslo *') as HTMLInputElement;
    const wrapper = passwordInput.parentElement as HTMLElement;
    const toggle = wrapper.querySelector('button[type="button"]') as HTMLButtonElement;
    
    expect(passwordInput.type).toBe('password');
    
    fireEvent.click(toggle);
    await waitFor(() => {
      expect((screen.getByLabelText('Heslo *') as HTMLInputElement).type).toBe('text');
    });
    
    fireEvent.click(toggle);
    await waitFor(() => {
      expect((screen.getByLabelText('Heslo *') as HTMLInputElement).type).toBe('password');
    });
  });

});
