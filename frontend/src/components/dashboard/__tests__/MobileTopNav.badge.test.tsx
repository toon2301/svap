import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileTopNav from '../MobileTopNav';

let mockRequestsUnreadCount = 0;
let mockMessageUnreadCount = 0;
let mockNotificationsUnreadCount = 0;

jest.mock('../contexts/RequestsNotificationsContext', () => ({
  __esModule: true,
  useRequestsNotifications: () => ({ unreadCount: mockRequestsUnreadCount }),
  useMessagesNotifications: () => ({ unreadCount: mockMessageUnreadCount }),
  useNotificationsUnread: () => ({ unreadCount: mockNotificationsUnreadCount }),
}));

describe('MobileTopNav messages badge', () => {
  beforeEach(() => {
    mockRequestsUnreadCount = 0;
    mockMessageUnreadCount = 0;
    mockNotificationsUnreadCount = 0;
  });

  it('shows the messages unread badge when not in the messages section', () => {
    mockMessageUnreadCount = 5;

    render(<MobileTopNav activeItem="home" onItemClick={jest.fn()} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('hides the messages unread badge as soon as the messages section is active', () => {
    mockMessageUnreadCount = 5;

    render(<MobileTopNav activeItem="messages" onItemClick={jest.fn()} />);

    // Badge zmizne hneď pri vstupe do Správ — nezávisle od toho, či je počet
    // stále > 0 (nemusí sa čakať na otvorenie konkrétnej konverzácie).
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('hides the messages unread badge when the total unread count is zero', () => {
    mockMessageUnreadCount = 0;

    render(<MobileTopNav activeItem="home" onItemClick={jest.fn()} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
