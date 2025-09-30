import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FavoritesModule from '../modules/FavoritesModule';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('FavoritesModule', () => {
  it('renders favorites header', () => {
    render(<FavoritesModule />);
    
    expect(screen.getByText('Oblúbené')).toBeInTheDocument();
  });

  it('renders tabs for users and skills', () => {
    render(<FavoritesModule />);
    
    expect(screen.getByText('Používatelia')).toBeInTheDocument();
    expect(screen.getByText('Zručnosti')).toBeInTheDocument();
  });

  it('shows users tab as active by default', () => {
    render(<FavoritesModule />);
    
    const usersTab = screen.getByText('Používatelia').closest('button');
    expect(usersTab).toHaveClass('bg-white', 'text-purple-700');
  });

  it('switches to skills tab when clicked', () => {
    render(<FavoritesModule />);
    
    const skillsTab = screen.getByText('Zručnosti');
    fireEvent.click(skillsTab);
    
    expect(skillsTab.closest('button')).toHaveClass('bg-white', 'text-purple-700');
  });

  it('shows mock users by default', () => {
    render(<FavoritesModule />);
    
    expect(screen.getByText('Jana Nováková')).toBeInTheDocument();
    expect(screen.getByText('Peter Kováč')).toBeInTheDocument();
  });

  it('shows empty state for skills when no favorites', () => {
    render(<FavoritesModule />);
    
    const skillsTab = screen.getByText('Zručnosti');
    fireEvent.click(skillsTab);
    
    expect(screen.getByText('Žiadne obľúbené zručnosti')).toBeInTheDocument();
    expect(screen.getByText('Pridajte zručnosti do obľúbených pre rýchlejšie vyhľadávanie')).toBeInTheDocument();
  });

  it('renders mock favorite users', () => {
    render(<FavoritesModule />);
    
    // Check if mock users are rendered (they should be based on the component)
    expect(screen.getByText('Jana Nováková')).toBeInTheDocument();
    expect(screen.getByText('Peter Kováč')).toBeInTheDocument();
  });

  it('displays user information correctly', () => {
    render(<FavoritesModule />);
    
    expect(screen.getByText('Jana Nováková')).toBeInTheDocument();
    expect(screen.getByText('Bratislava')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('UI/UX')).toBeInTheDocument();
  });

  it('shows online status indicator', () => {
    render(<FavoritesModule />);
    
    // Check for online indicator (green dot)
    const onlineIndicator = document.querySelector('.bg-green-400');
    expect(onlineIndicator).toBeInTheDocument();
  });

  it('displays user ratings', () => {
    render(<FavoritesModule />);
    
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('4.6')).toBeInTheDocument();
  });

  it('has remove button for each user', () => {
    render(<FavoritesModule />);
    
    // Find buttons by their SVG content (X icon)
    const removeButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    );
    expect(removeButtons).toHaveLength(2); // Two mock users
  });

  it('calls remove function when remove button is clicked', () => {
    render(<FavoritesModule />);
    
    // Find buttons by their SVG content (X icon)
    const removeButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    );
    fireEvent.click(removeButtons[0]);
    
    // User should be removed from the list
    expect(screen.queryByText('Jana Nováková')).not.toBeInTheDocument();
  });
});
