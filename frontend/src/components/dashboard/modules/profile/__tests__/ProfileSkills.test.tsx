import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileSkills from '../ProfileSkills';
import { User } from '../../../../../types';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_verified: true,
  date_joined: '2023-01-01T00:00:00Z',
  profile_picture: null,
  bio: null,
  location: null
};

describe('ProfileSkills', () => {
  it('renders all skills', () => {
    render(<ProfileSkills user={mockUser} />);
    
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('renders skill levels correctly', () => {
    render(<ProfileSkills user={mockUser} />);
    
    expect(screen.getByText('Expert')).toBeInTheDocument();
    expect(screen.getByText('Pokročilý')).toBeInTheDocument();
    expect(screen.getByText('Začiatočník')).toBeInTheDocument();
  });

  it('applies correct color classes for skill levels', () => {
    render(<ProfileSkills user={mockUser} />);
    
    // Expert (advanced) - red
    const expertBadge = screen.getByText('Expert').closest('span');
    expect(expertBadge).toHaveClass('bg-red-100', 'text-red-800');
    
    // Pokročilý (intermediate) - yellow
    const intermediateBadge = screen.getByText('Pokročilý').closest('span');
    expect(intermediateBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    
    // Začiatočník (beginner) - green
    const beginnerBadge = screen.getByText('Začiatočník').closest('span');
    expect(beginnerBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('renders section title', () => {
    render(<ProfileSkills user={mockUser} />);
    expect(screen.getByText('Zručnosti')).toBeInTheDocument();
  });

  it('renders wrench icon', () => {
    render(<ProfileSkills user={mockUser} />);
    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('renders skills in correct order', () => {
    render(<ProfileSkills user={mockUser} />);
    
    const skillItems = screen.getAllByText(/JavaScript|React|Python|Design/);
    expect(skillItems[0]).toHaveTextContent('JavaScript');
    expect(skillItems[1]).toHaveTextContent('React');
    expect(skillItems[2]).toHaveTextContent('Python');
    expect(skillItems[3]).toHaveTextContent('Design');
  });

  it('has correct styling for skill items', () => {
    render(<ProfileSkills user={mockUser} />);
    
    const skillItems = screen.getAllByText(/JavaScript|React|Python|Design/);
    skillItems.forEach(item => {
      const skillContainer = item.closest('.flex');
      expect(skillContainer).toHaveClass('items-center', 'justify-between', 'p-3', 'bg-gray-50', 'rounded-lg');
    });
  });
});
