import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeModule from '../modules/HomeModule';
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

describe('HomeModule', () => {
  it('renders welcome message with user name', () => {
    render(<HomeModule user={mockUser} />);
    
    expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
    expect(screen.getByText(/Toto je tvoj osobný dashboard/)).toBeInTheDocument();
  });

  it('displays profile completeness', () => {
    render(<HomeModule user={mockUser} />);
    
    expect(screen.getByText('Kompletnosť profilu')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows profile completeness warning when less than 100%', () => {
    render(<HomeModule user={mockUser} />);
    
    expect(screen.getByText('Dokončite svoj profil pre lepšiu viditeľnosť')).toBeInTheDocument();
  });

  it('does not show profile completeness warning when 100%', () => {
    const completeUser = { ...mockUser, profile_completeness: 100 };
    render(<HomeModule user={completeUser} />);
    
    expect(screen.queryByText('Dokončite svoj profil pre lepšiu viditeľnosť')).not.toBeInTheDocument();
  });

  it('renders quick stats cards', () => {
    render(<HomeModule user={mockUser} />);
    
    expect(screen.getByText('Moje zručnosti')).toBeInTheDocument();
    expect(screen.getByText('Aktívne výmeny')).toBeInTheDocument();
    expect(screen.getByText('Dokončené')).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    render(<HomeModule user={mockUser} />);
    
    expect(screen.getByText('Rýchle akcie')).toBeInTheDocument();
    expect(screen.getByText('Pridať zručnosť')).toBeInTheDocument();
    expect(screen.getByText('Hľadať zručnosti')).toBeInTheDocument();
    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();
    expect(screen.getByText('Správy')).toBeInTheDocument();
  });

  it('displays correct stats values', () => {
    render(<HomeModule user={mockUser} />);
    
    // Check that all stats show 0 (as per current implementation)
    const statsValues = screen.getAllByText('0');
    expect(statsValues).toHaveLength(3);
  });
});
