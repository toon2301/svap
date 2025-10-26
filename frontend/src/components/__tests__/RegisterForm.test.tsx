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

  it('shows company fields when company type is selected', () => {
    const { container } = render(<RegisterForm />);
    const userTypeSelect = container.querySelector('#user_type') as HTMLSelectElement;
    fireEvent.change(userTypeSelect, { target: { value: 'company' } });
    expect(screen.getByText('Informácie o firme')).toBeInTheDocument();
    expect(screen.getByLabelText('Názov firmy *')).toBeInTheDocument();
  });

  it('validates company name when company type is selected', async () => {
    const { container } = render(<RegisterForm />);
    
    const userTypeSelect = screen.getByDisplayValue('Osoba');
    fireEvent.change(userTypeSelect, { target: { value: 'company' } });
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Názov firmy je povinný')).toBeInTheDocument();
    });
  });

  it('handles successful registration', async () => {
    const mockResponse = {
      data: {
        message: 'Registrácia bola úspešná. Skontrolujte si email a potvrďte registráciu.',
        email_sent: true
      },
    };
    
    mockApiPost.mockResolvedValueOnce(mockResponse);
    
    const { container } = render(<RegisterForm />);
    
    // Vyplň všetky povinné polia
    fireEvent.change(screen.getByLabelText('Používateľské meno *'), { 
      target: { value: 'testuser' } 
    });
    fireEvent.change(screen.getByLabelText('Email *'), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText('Heslo *'), { 
      target: { value: 'password123' } 
    });
    fireEvent.change(screen.getByLabelText('Potvrdenie hesla *'), { 
      target: { value: 'password123' } 
    });
    const birth1 = container.querySelector('#birth_date') as HTMLInputElement;
    fireEvent.change(birth1, { target: { value: '1990-06-15' } });
    fireEvent.change(screen.getByDisplayValue('Vyberte pohlavie'), { 
      target: { value: 'male' } 
    });
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/register/', expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        user_type: 'individual',
        birth_day: '15',
        birth_month: '06',
        birth_year: '1990',
        gender: 'male',
      }));
    });

    // Over, že sa zobrazil success obsah (dve výskyty v hlavičke a v alert boxe)
    expect(screen.getAllByText('Registrácia úspešná!').length).toBeGreaterThan(0);

    // Skontroluj, že sa nevolá router.push (nová implementácia nepresmerováva)
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles registration error', async () => {
    const mockError = {
      response: {
        data: {
          details: {
            email: 'Email už existuje',
          },
        },
      },
    };
    
    mockApiPost.mockRejectedValueOnce(mockError);
    
    const { container: container2 } = render(<RegisterForm />);
    
    // Vyplň minimálne polia
    fireEvent.change(screen.getByLabelText('Používateľské meno *'), { 
      target: { value: 'testuser' } 
    });
    fireEvent.change(screen.getByLabelText('Email *'), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText('Heslo *'), { 
      target: { value: 'password123' } 
    });
    fireEvent.change(screen.getByLabelText('Potvrdenie hesla *'), { 
      target: { value: 'password123' } 
    });
    const birth2 = container2.querySelector('#birth_date') as HTMLInputElement;
    fireEvent.change(birth2, { target: { value: '1990-06-15' } });
    fireEvent.change(screen.getByDisplayValue('Vyberte pohlavie'), { 
      target: { value: 'male' } 
    });
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => expect(mockApiPost).toHaveBeenCalled());
    // Nemal by sa zobraziť success stav
    expect(screen.queryByText('Registrácia úspešná!')).not.toBeInTheDocument();
    // Chyba pri emaile by mala byť viditeľná
    expect(screen.getByText(/Email už existuje/)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText('Heslo *') as HTMLInputElement;
    // Prvý toggle button (ikona vpravo)
    const toggleButtons = screen.getAllByRole('button');
    const toggle = toggleButtons.find(btn => (btn as HTMLButtonElement).type === 'button') as HTMLButtonElement;
    
    expect(passwordInput.type).toBe('password');
    
    fireEvent.click(toggle);
    expect(passwordInput.type).toBe('text');
    
    fireEvent.click(toggle);
    expect(passwordInput.type).toBe('password');
  });

  it('shows success message after successful registration', async () => {
    const mockResponse = {
      data: {
        message: 'Registrácia bola úspešná. Skontrolujte si email a potvrďte registráciu.',
        email_sent: true
      },
    };
    
    mockApiPost.mockResolvedValueOnce(mockResponse);
    
    const { container: container3 } = render(<RegisterForm />);
    
    // Vyplň všetky povinné polia
    fireEvent.change(screen.getByLabelText('Používateľské meno *'), { 
      target: { value: 'testuser' } 
    });
    fireEvent.change(screen.getByLabelText('Email *'), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText('Heslo *'), { 
      target: { value: 'password123' } 
    });
    fireEvent.change(screen.getByLabelText('Potvrdenie hesla *'), { 
      target: { value: 'password123' } 
    });
    const birth3 = container3.querySelector('#birth_date') as HTMLInputElement;
    fireEvent.change(birth3, { target: { value: '1990-06-15' } });
    fireEvent.change(screen.getByDisplayValue('Vyberte pohlavie'), { 
      target: { value: 'male' } 
    });
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText('Registrácia úspešná!').length).toBeGreaterThan(0);
      expect(screen.getByText(/Skontrolujte si email a potvrďte registráciu/)).toBeInTheDocument();
    });

    // Skontroluj, že sa formulár skryl
    expect(screen.queryByLabelText('Používateľské meno *')).not.toBeInTheDocument();
    
    // Skontroluj, že sa zobrazuje tlačidlo na prihlásenie
    expect(screen.getByText('Po overení emailu sa môžete prihlásiť')).toBeInTheDocument();
    expect(screen.getByText('Prihlásiť sa')).toBeInTheDocument();
  });

  it('does not redirect after successful registration', async () => {
    const mockResponse = {
      data: {
        message: 'Registrácia bola úspešná. Skontrolujte si email a potvrďte registráciu.',
        email_sent: true
      },
    };
    
    mockApiPost.mockResolvedValueOnce(mockResponse);
    
    const { container: container4 } = render(<RegisterForm />);
    
    // Vyplň minimálne polia
    fireEvent.change(screen.getByLabelText('Používateľské meno *'), { 
      target: { value: 'testuser' } 
    });
    fireEvent.change(screen.getByLabelText('Email *'), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText('Heslo *'), { 
      target: { value: 'password123' } 
    });
    fireEvent.change(screen.getByLabelText('Potvrdenie hesla *'), { 
      target: { value: 'password123' } 
    });
    const birth4 = container4.querySelector('#birth_date') as HTMLInputElement;
    fireEvent.change(birth4, { target: { value: '1990-06-15' } });
    fireEvent.change(screen.getByDisplayValue('Vyberte pohlavie'), { 
      target: { value: 'male' } 
    });
    
    const submitButton = screen.getByRole('button', { name: 'Registrovať sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText('Registrácia úspešná!').length).toBeGreaterThan(0);
    });

    // Skontroluj, že sa nevolá router.push
    expect(mockPush).not.toHaveBeenCalled();
  });
});
