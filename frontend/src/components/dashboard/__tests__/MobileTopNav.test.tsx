import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileTopNav from '../MobileTopNav';

let mockRequestsUnreadCount = 0;
let mockMessageUnreadCount = 0;
let mockNotificationsUnreadCount = 0;
const mockMarkAllNotificationsRead = jest.fn();

jest.mock('../contexts/RequestsNotificationsContext', () => ({
  __esModule: true,
  useRequestsNotifications: () => ({
    unreadCount: mockRequestsUnreadCount,
    refreshUnreadCount: jest.fn(),
    markAllRead: jest.fn(),
  }),
  useMessagesNotifications: () => ({
    unreadCount: mockMessageUnreadCount,
    refreshUnreadCount: jest.fn(),
    setActiveConversationId: jest.fn(),
    syncConversationReadState: jest.fn(),
  }),
  useNotificationsUnread: () => ({
    unreadCount: mockNotificationsUnreadCount,
    refreshUnreadCount: jest.fn(),
    markAllRead: mockMarkAllNotificationsRead,
  }),
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: () => <div>HomeIcon</div>,
  MagnifyingGlassIcon: () => <div>SearchIcon</div>,
  InboxIcon: () => <div>InboxIcon</div>,
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
    mockRequestsUnreadCount = 0;
    mockMessageUnreadCount = 0;
    mockNotificationsUnreadCount = 0;
  });

  it('renders all navigation items', () => {
    render(<MobileTopNav {...defaultProps} />);
    
    expect(screen.getByLabelText('Domov')).toBeInTheDocument();
    expect(screen.getByLabelText('Hľadať')).toBeInTheDocument();
    expect(screen.getByLabelText('Spolupráce')).toBeInTheDocument();
    expect(screen.getByLabelText('Správy')).toBeInTheDocument();
    expect(screen.getByLabelText('Upozornenia')).toBeInTheDocument();
  });

  it('calls onItemClick when nav item is clicked', () => {
    render(<MobileTopNav {...defaultProps} />);
    
    const homeButton = screen.getByLabelText('Domov');
    fireEvent.click(homeButton);
    
    expect(mockOnItemClick).toHaveBeenCalledWith('home');
  });

  // Menu button has been replaced by notifications; ensure notifications is clickable.
  it('opens notifications without marking them read', () => {
    mockNotificationsUnreadCount = 2;
    render(<MobileTopNav {...defaultProps} />);
    const notifButton = screen.getByLabelText('Upozornenia');
    fireEvent.click(notifButton);
    expect(mockOnItemClick).toHaveBeenCalledWith('notifications');
    expect(mockMarkAllNotificationsRead).not.toHaveBeenCalled();
  });

  it('highlights active item', () => {
    render(<MobileTopNav {...defaultProps} activeItem="search" />);
    
    const searchButton = screen.getByLabelText('Hľadať');
    expect(searchButton).toHaveClass('bg-gray-900', 'text-white');
  });

  it('uses a responsive glass surface for the floating navigation', () => {
    const { container } = render(<MobileTopNav {...defaultProps} />);

    const navigation = container.querySelector('nav');
    expect(navigation).toHaveClass('bg-white/70', 'backdrop-blur-xl', 'dark:bg-gray-950/70');
  });

  // Create button bol nahradený requests; coverage ponecháme na existujúcich testoch.
  it('shows a message unread badge only when messages is not active', () => {
    mockMessageUnreadCount = 4;

    const { rerender } = render(<MobileTopNav {...defaultProps} activeItem="home" />);

    expect(screen.getByLabelText(/4 nové správy/i)).toBeInTheDocument();

    rerender(<MobileTopNav {...defaultProps} activeItem="messages" />);

    expect(screen.queryByLabelText(/4 nové správy/i)).not.toBeInTheDocument();
  });
});

