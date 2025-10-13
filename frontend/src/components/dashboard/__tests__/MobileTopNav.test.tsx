import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileTopNav from '../MobileTopNav';

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: () => <div>HomeIcon</div>,
  MagnifyingGlassIcon: () => <div>SearchIcon</div>,
  PlusCircleIcon: () => <div>PlusIcon</div>,
  ChatBubbleLeftRightIcon: () => <div>MessagesIcon</div>,
  BellIcon: () => <div>BellIcon</div>,
}));

describe('MobileTopNav', () => {
  const mockOnItemClick = jest.fn();

  const defaultProps = {
    activeItem: 'home',
    onItemClick: mockOnItemClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all navigation items', () => {
    render(<MobileTopNav {...defaultProps} />);
    
    expect(screen.getByLabelText('Domov')).toBeInTheDocument();
    expect(screen.getByLabelText('Hľadať')).toBeInTheDocument();
    expect(screen.getByLabelText('Pridať')).toBeInTheDocument();
    expect(screen.getByLabelText('Správy')).toBeInTheDocument();
    expect(screen.getByLabelText('Upozornenia')).toBeInTheDocument();
  });

  it('calls onItemClick when nav item is clicked', () => {
    render(<MobileTopNav {...defaultProps} />);
    
    const homeButton = screen.getByLabelText('Domov');
    fireEvent.click(homeButton);
    
    expect(mockOnItemClick).toHaveBeenCalledWith('home');
  });

  // Menu button has been replaced by notifications; ensure notifications is clickable
  it('calls onItemClick when notifications button is clicked', () => {
    render(<MobileTopNav {...defaultProps} />);
    const notifButton = screen.getByLabelText('Upozornenia');
    fireEvent.click(notifButton);
    expect(mockOnItemClick).toHaveBeenCalledWith('notifications');
  });

  it('highlights active item', () => {
    render(<MobileTopNav {...defaultProps} activeItem="search" />);
    
    const searchButton = screen.getByLabelText('Hľadať');
    expect(searchButton).toHaveClass('text-purple-600');
  });

  it('renders special create button with circle background', () => {
    render(<MobileTopNav {...defaultProps} activeItem="create" />);
    
    const createButton = screen.getByLabelText('Pridať');
    const circle = createButton.querySelector('.rounded-full');
    expect(circle).toBeInTheDocument();
  });
});

