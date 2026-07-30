import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { HTMLAttributes, ReactNode } from 'react';
import Sidebar from '../Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

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

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
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
    mockRequestsUnreadCount = 0;
    mockMessageUnreadCount = 0;
    mockNotificationsUnreadCount = 0;
  });

  it('renders all navigation items', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);
    
    expect(screen.getByText('Nástenka')).toBeInTheDocument();
    expect(screen.getByText('Vyhľadávanie')).toBeInTheDocument();
    expect(screen.getByText('Obľúbené')).toBeInTheDocument();
    expect(screen.getByText('Štatistiky')).toBeInTheDocument();
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

  it('places Statistics after Notifications in the desktop navigation', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);

    const navItems = Array.from(document.querySelectorAll('[data-sidebar-nav-item]'));
    const notificationsIndex = navItems.findIndex(
      (item) => item.getAttribute('data-sidebar-nav-item') === 'notifications',
    );
    const statisticsIndex = navItems.findIndex(
      (item) => item.getAttribute('data-sidebar-nav-item') === 'statistics',
    );

    expect(statisticsIndex).toBe(notificationsIndex + 1);
  });

  it('does not add Statistics to the mobile settings menu yet', () => {
    render(
      <ThemeProvider>
        <Sidebar
          {...defaultProps}
          onLogout={() => {}}
          isMobile
          isOpen
          onClose={mockOnClose}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText('Štatistiky')).not.toBeInTheDocument();
  });

  it('opens the bug report dialog from mobile settings and closes the menu', () => {
    const onBugReportRequest = jest.fn();
    window.addEventListener('svaply:bug-report-dialog-request', onBugReportRequest);
    render(
      <ThemeProvider>
        <Sidebar
          {...defaultProps}
          onLogout={() => {}}
          isMobile
          isOpen
          onClose={mockOnClose}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nahlásiť problém' }));

    expect(onBugReportRequest).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    window.removeEventListener('svaply:bug-report-dialog-request', onBugReportRequest);
  });

  it('moves theme and logout into the mobile More menu', () => {
    render(
      <ThemeProvider>
        <Sidebar
          {...defaultProps}
          onLogout={() => {}}
          isMobile
          isOpen
          onClose={mockOnClose}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText('Tmavý režim')).not.toBeInTheDocument();
    expect(screen.queryByText('Odhlásiť sa')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));
    expect(screen.getByRole('menuitem', { name: 'Tmavý režim' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Odhlásiť sa' })).toBeInTheDocument();
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
    
    const closeButton = screen.getByRole('button', { name: /zatvoriť/i });
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
      name: /zatvoriť/i 
    });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows logout inside the desktop More menu', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);

    expect(screen.queryByText('Odhlásiť sa')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));
    expect(screen.getByText('Odhlásiť sa')).toBeInTheDocument();
  });

  it('shows Svaply logo', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);

    // Logo je obrázok s alt tagom
    expect(screen.getByAltText('Svaply')).toBeInTheDocument();
  });
  it('routes to messages when the messages item is clicked', () => {
    render(<ThemeProvider><Sidebar {...defaultProps} onLogout={() => {}} /></ThemeProvider>);

    fireEvent.click(screen.getByText('Spr\u00e1vy'));

    expect(mockOnItemClick).toHaveBeenCalledWith('messages');
  });

  it('shows a message unread badge only when messages module is not active', () => {
    mockMessageUnreadCount = 5;

    const { rerender } = render(
      <ThemeProvider>
        <Sidebar {...defaultProps} onLogout={() => {}} activeItem="home" />
      </ThemeProvider>,
    );

    expect(screen.getByText('5')).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <Sidebar {...defaultProps} onLogout={() => {}} activeItem="messages" />
      </ThemeProvider>,
    );

    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('shows a notifications unread badge without marking notifications read on click', () => {
    mockNotificationsUnreadCount = 6;
    const onNotificationsClick = jest.fn();

    render(
      <ThemeProvider>
        <Sidebar
          {...defaultProps}
          onLogout={() => {}}
          activeItem="home"
          onNotificationsClick={onNotificationsClick}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('6')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Upozornenia'));

    expect(mockMarkAllNotificationsRead).not.toHaveBeenCalled();
    expect(onNotificationsClick).toHaveBeenCalled();
  });
});
