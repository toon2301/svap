import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileModule from '../modules/ProfileModule';
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
  bio: 'Test bio',
  location: 'Bratislava',
  website: 'https://test.com',
  linkedin: 'https://linkedin.com/in/test',
  facebook: 'https://facebook.com/test',
  instagram: 'https://instagram.com/test',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 85,
};

describe('ProfileModule', () => {
  it('renders user name and basic info', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    expect(screen.getByText(/Jednotlivec/)).toBeInTheDocument();
  });

  it('shows verified badge for verified users', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Overený')).toBeInTheDocument();
  });

  it('displays user bio', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Test bio')).toBeInTheDocument();
  });

  it('shows contact information', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Bratislava')).toBeInTheDocument();
    expect(screen.getByText('https://test.com')).toBeInTheDocument();
  });

  it('renders social media links', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
  });

  it('displays profile completeness', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Kompletnosť profilu')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows profile completeness warning when less than 100%', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Dokončite svoj profil pre lepšiu viditeľnosť a viac možností')).toBeInTheDocument();
  });

  it('renders edit profile button', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();
  });

  it('calls onEditProfile when edit button is clicked', () => {
    const mockOnEditProfile = jest.fn();
    render(<ProfileModule user={mockUser} onEditProfile={mockOnEditProfile} />);
    
    const editButton = screen.getByText('Upraviť profil');
    fireEvent.click(editButton);
    
    expect(mockOnEditProfile).toHaveBeenCalled();
  });

  it('renders skills section', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Moje zručnosti')).toBeInTheDocument();
    expect(screen.getByText('Pridať zručnosť')).toBeInTheDocument();
  });

  it('shows empty skills state', () => {
    render(<ProfileModule user={mockUser} />);
    
    expect(screen.getByText('Zatiaľ nemáte pridané žiadne zručnosti')).toBeInTheDocument();
  });

  it('renders avatar placeholder when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };
    render(<ProfileModule user={userWithoutAvatar} />);
    
    // Check for user icon (avatar placeholder)
    const userIcon = document.querySelector('svg');
    expect(userIcon).toBeInTheDocument();
  });

  it('renders actual avatar when provided', () => {
    const userWithAvatar = { ...mockUser, avatar: 'https://example.com/avatar.jpg' };
    render(<ProfileModule user={userWithAvatar} />);
    
    const avatarImage = screen.getByAltText('Test');
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders camera button for avatar', () => {
    render(<ProfileModule user={mockUser} />);
    
    // Find camera button by its SVG content
    const cameraButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg path[d*="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23"]')
    );
    expect(cameraButton).toBeInTheDocument();
  });
});
