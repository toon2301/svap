import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Sidebar', () => {
  const mockOnItemClick = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    activeItem: 'home',
    onItemClick: mockOnItemClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all navigation items', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);
    
    expect(screen.getByText('Nástenka')).toBeInTheDocument();
    expect(screen.getByText('Vyhľadávanie')).toBeInTheDocument();
    expect(screen.getByText('Oblúbené')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('Nastavenia')).toBeInTheDocument();
  });

  it('highlights active item', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} activeItem="search" /></ThemeProvider>);
    
    const searchButton = screen.getByText('Vyhľadávanie').closest('button');
    expect(searchButton).toHaveClass('bg-purple-100', 'text-purple-800');
  });

  it('calls onItemClick when item is clicked', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);
    
    const searchButton = screen.getByText('Vyhľadávanie');
    fireEvent.click(searchButton);
    
    expect(mockOnItemClick).toHaveBeenCalledWith('search');
  });

  it('renders mobile overlay when isMobile and isOpen', () => {
    render(
      <ThemeProvider>
        <Sidebar 
          {...defaultProps} 
          onLogout={() => {}}
          isMobile={true} 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      </ThemeProvider>
    );
    
    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    expect(overlay).toBeInTheDocument();
  });

  it('calls onClose when mobile overlay is clicked', () => {
    render(
      <ThemeProvider>
        <Sidebar 
          {...defaultProps} 
          onLogout={() => {}}
          isMobile={true} 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      </ThemeProvider>
    );
    
    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders close button in mobile mode', () => {
    render(
      <ThemeProvider>
        <Sidebar 
          {...defaultProps} 
          onLogout={() => {}}
          isMobile={true} 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      </ThemeProvider>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ThemeProvider>
        <Sidebar 
          {...defaultProps} 
          onLogout={() => {}}
          isMobile={true} 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      </ThemeProvider>
    );
    
    // Find the close button by looking for the X icon
    const closeButton = screen.getByRole('button', { 
      name: /close/i 
    });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders logout button', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);
    
    expect(screen.getByText('Odhlásiť sa')).toBeInTheDocument();
  });

  it('shows Swaply logo', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);
    
    expect(screen.getByText('Swaply')).toBeInTheDocument();
  });
});
