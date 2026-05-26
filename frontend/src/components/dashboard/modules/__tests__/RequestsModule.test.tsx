import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestsModule from '../RequestsModule';
import { RequestSummaryCard } from '../requests/RequestSummaryCard';
import { confirmCompletion, fetchSkillRequests, updateSkillRequest } from '../requests/requestsApi';

const mockMarkAllRead = jest.fn().mockResolvedValue(undefined);
const mockRefreshUnreadCount = jest.fn();
const mockPush = jest.fn();
let mockUnreadCount = 0;

const mockUseIsMobileState = jest.fn(() => ({
  isMobile: false,
  isResolved: true,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, defaultValue?: string) =>
      typeof defaultValue === 'string' ? defaultValue : key,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      avatar_url: null,
    },
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockUseIsMobileState().isMobile,
  useIsMobileState: () => mockUseIsMobileState(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

jest.mock('../../contexts/RequestsNotificationsContext', () => ({
  useRequestsNotifications: () => ({
    unreadCount: mockUnreadCount,
    refreshUnreadCount: mockRefreshUnreadCount,
    markAllRead: mockMarkAllRead,
  }),
}));

jest.mock('../requests/requestsApi', () => ({
  fetchSkillRequests: jest.fn().mockResolvedValue({ received: [], sent: [] }),
  updateSkillRequest: jest.fn().mockResolvedValue({ data: { id: 1, status: 'pending' } }),
  requestCompletion: jest.fn(),
  confirmCompletion: jest.fn(),
}));

const pendingReceivedRequest = {
  id: 11,
  status: 'pending',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
  requester: 42,
  recipient: 1,
  offer: 77,
  requester_display_name: 'Requester User',
  recipient_display_name: 'Test User',
  offer_is_seeking: false,
  offer_category: 'general',
  offer_subcategory: 'Test ponuka',
  offer_description: 'Test popis',
  requester_summary: {
    id: 42,
    display_name: 'Requester User',
    slug: 'requester-user',
    avatar_url: null,
  },
  recipient_summary: {
    id: 1,
    display_name: 'Test User',
    slug: 'test-user',
    avatar_url: null,
  },
  offer_summary: {
    id: 77,
    subcategory: 'Test ponuka',
    is_seeking: false,
    is_hidden: false,
    price_from: null,
    price_currency: 'EUR',
  },
};

const completedSentRequest = {
  ...pendingReceivedRequest,
  id: 12,
  status: 'completed',
  requester: 1,
  recipient: 42,
  requester_display_name: 'Test User',
  recipient_display_name: 'Provider User',
  requester_summary: {
    id: 1,
    display_name: 'Test User',
    slug: 'test-user',
    avatar_url: null,
  },
  recipient_summary: {
    id: 42,
    display_name: 'Provider User',
    slug: 'provider-user',
    avatar_url: null,
  },
  offer_summary: {
    ...pendingReceivedRequest.offer_summary,
    already_reviewed: false,
  },
};

const completionRequestedSentRequest = {
  ...completedSentRequest,
  id: 13,
  status: 'completion_requested',
};

describe('RequestsModule', () => {
  beforeEach(() => {
    mockUnreadCount = 0;
    mockMarkAllRead.mockClear();
    mockRefreshUnreadCount.mockClear();
    mockPush.mockClear();
    mockUseIsMobileState.mockReturnValue({ isMobile: false, isResolved: true });
    (fetchSkillRequests as jest.Mock).mockReset();
    (fetchSkillRequests as jest.Mock).mockResolvedValue({ received: [], sent: [] });
    (updateSkillRequest as jest.Mock).mockReset();
    (updateSkillRequest as jest.Mock).mockResolvedValue({ data: { id: 1, status: 'pending' } });
    (confirmCompletion as jest.Mock).mockReset();
  });

  it('renders heading and empty state', async () => {
    render(<RequestsModule />);
    expect(screen.getByText(/Spolu/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/iadosti/).length).toBeGreaterThan(0);
    });
  });

  it('marks unread requests as read after the received pending view finishes loading', async () => {
    mockUnreadCount = 2;

    render(<RequestsModule />);

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });
  });

  it('does not fetch skill requests until viewport breakpoint is resolved', () => {
    mockUseIsMobileState.mockReturnValue({ isMobile: false, isResolved: false });

    render(<RequestsModule />);

    expect(fetchSkillRequests as jest.Mock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Spolu/)).not.toBeInTheDocument();
  });

  it('opens active sent requests from a route intent', async () => {
    (fetchSkillRequests as jest.Mock).mockImplementation(async (statusQuery?: string) => ({
      received: [],
      sent: statusQuery === 'accepted,completion_requested' ? [completionRequestedSentRequest] : [],
    }));

    render(<RequestsModule routeIntent={{ statusTab: 'active', tab: 'sent', key: 1 }} />);

    await waitFor(() => {
      expect(fetchSkillRequests).toHaveBeenCalledWith('accepted,completion_requested');
    });
    expect(await screen.findByText('Provider User')).toBeInTheDocument();
  });

  it('redirects to the requester conversation after accepting a received request on desktop', async () => {
    (fetchSkillRequests as jest.Mock).mockImplementation(async (statusQuery?: string) => ({
      received: statusQuery === 'pending' ? [pendingReceivedRequest] : [],
      sent: [],
    }));
    (updateSkillRequest as jest.Mock).mockResolvedValueOnce({
      data: { ...pendingReceivedRequest, status: 'accepted', conversation_id: 123 },
    });

    render(<RequestsModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'requests.accept' }));

    await waitFor(() => {
      expect(updateSkillRequest).toHaveBeenCalledWith(11, 'accept');
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/messages?conversationId=123');
    });
  });

  it('redirects to the requester conversation after accepting a received request on mobile', async () => {
    mockUseIsMobileState.mockReturnValue({ isMobile: true, isResolved: true });
    (fetchSkillRequests as jest.Mock).mockImplementation(async (statusQuery?: string) => ({
      received: statusQuery === 'pending' ? [pendingReceivedRequest] : [],
      sent: [],
    }));
    (updateSkillRequest as jest.Mock).mockResolvedValueOnce({
      data: { ...pendingReceivedRequest, status: 'accepted', conversation_id: 123 },
    });

    render(<RequestsModule />);

    const requesterName = await screen.findByText('Requester User');
    fireEvent.click(requesterName.closest('[role="button"]') as Element);
    fireEvent.click(await screen.findByRole('button', { name: 'requests.accept' }));

    await waitFor(() => {
      expect(updateSkillRequest).toHaveBeenCalledWith(11, 'accept');
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/messages?conversationId=123');
    });
  });

  it('falls back to requester draft route after accepting when no conversation id is returned', async () => {
    (fetchSkillRequests as jest.Mock).mockImplementation(async (statusQuery?: string) => ({
      received: statusQuery === 'pending' ? [pendingReceivedRequest] : [],
      sent: [],
    }));
    (updateSkillRequest as jest.Mock).mockResolvedValueOnce({
      data: { ...pendingReceivedRequest, status: 'accepted' },
    });

    render(<RequestsModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'requests.accept' }));

    await waitFor(() => {
      expect(updateSkillRequest).toHaveBeenCalledWith(11, 'accept');
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/messages?targetUserId=42');
    });
  });

  it('shows the review action on completed sent requests until a review exists', () => {
    const onOpenReview = jest.fn();
    const itemWithoutExplicitReviewState = {
      ...completedSentRequest,
      offer_summary: {
        ...completedSentRequest.offer_summary,
        already_reviewed: undefined,
      },
    };

    render(
      <RequestSummaryCard
        item={itemWithoutExplicitReviewState as any}
        variant="sent"
        showReviewButton
        onOpenReview={onOpenReview}
      />,
    );

    const button = screen.getByRole('button', { name: /Prida/i });
    fireEvent.click(button);

    expect(onOpenReview).toHaveBeenCalledWith(77);
  });

  it('hides the review action after a completed sent request has already been reviewed', () => {
    render(
      <RequestSummaryCard
        item={
          {
            ...completedSentRequest,
            offer_summary: {
              ...completedSentRequest.offer_summary,
              already_reviewed: true,
            },
          } as any
        }
        variant="sent"
        showReviewButton
        onOpenReview={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Prida/i })).not.toBeInTheDocument();
  });

  it('switches to completed sent requests after confirming completion', async () => {
    (fetchSkillRequests as jest.Mock).mockImplementation(async (statusQuery?: string) => ({
      received: [],
      sent:
        statusQuery === 'accepted,completion_requested'
          ? [completionRequestedSentRequest]
          : statusQuery === 'completed'
            ? [{ ...completionRequestedSentRequest, status: 'completed' }]
            : [],
    }));
    (confirmCompletion as jest.Mock).mockResolvedValueOnce({
      data: { ...completionRequestedSentRequest, status: 'completed' },
    });

    render(<RequestsModule />);

    fireEvent.click(await screen.findByRole('tab', { name: /Akt/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Odoslan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Potvrdi/i }));

    await waitFor(() => {
      expect(confirmCompletion).toHaveBeenCalledWith(13);
    });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Dokon/i })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('tab', { name: /Odoslan/i })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Prida/i }).length).toBeGreaterThan(0);
    });
  });
});
