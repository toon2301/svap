import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraftConversationDetail } from './DraftConversationDetail';
import { openConversation } from './messagingApi';

const replaceMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
}));

jest.mock('./messagingApi', () => ({
  __esModule: true,
  openConversation: jest.fn(),
}));

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};

const draftResponse = {
  id: null,
  is_draft: true,
  target_user_id: 42,
  other_user: { id: 42, display_name: 'Test User' },
  last_message_preview: null,
  last_message_at: null,
  last_message_sender_id: null,
  last_read_at: null,
  has_unread: false,
  updated_at: null,
};

describe('DraftConversationDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(false);
  });

  it('redirects immediately when a started conversation already exists', async () => {
    (openConversation as jest.Mock).mockResolvedValue({
      id: 77,
      is_draft: false,
      target_user_id: 42,
      other_user: { id: 42, display_name: 'Test User' },
      last_message_preview: 'Ahoj',
      last_message_at: '2026-03-30T10:00:00Z',
      last_read_at: '2026-03-30T10:00:00Z',
      has_unread: false,
      updated_at: '2026-03-30T10:00:00Z',
    });

    render(<DraftConversationDetail targetUserId={42} />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/messages?conversationId=77');
    });
  });

  it('renders draft compose state when no started conversation exists', async () => {
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);

    render(<DraftConversationDetail targetUserId={42} />);

    expect(await screen.findByText('Začnite konverzáciu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Napíš správu…')).toBeInTheDocument();
  });

});
