import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessagesModule from '../MessagesModule';

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
}));

jest.mock('../messages/ConversationsList', () => ({
  __esModule: true,
  ConversationsList: ({ selectedConversationId }: { selectedConversationId?: number | null }) => (
    <div>ConversationsList:{selectedConversationId ?? 'none'}</div>
  ),
}));

jest.mock('../messages/ConversationDetail', () => ({
  __esModule: true,
  ConversationDetail: ({ conversationId }: { conversationId: number }) => (
    <div>ConversationDetail:{conversationId}</div>
  ),
}));

jest.mock('../messages/DraftConversationDetail', () => ({
  __esModule: true,
  DraftConversationDetail: ({ targetUserId }: { targetUserId: number }) => (
    <div>DraftConversationDetail:{targetUserId}</div>
  ),
}));

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};

describe('MessagesModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders desktop empty state without embedding the conversations rail', () => {
    useIsMobile.mockReturnValue(false);

    render(<MessagesModule currentUserId={1} />);

    expect(screen.getByText('Vaše správy')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });

  it('renders desktop detail content without the in-module conversations rail', () => {
    useIsMobile.mockReturnValue(false);

    render(<MessagesModule currentUserId={1} conversationId={7} />);

    expect(screen.getByText('ConversationDetail:7')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:7')).not.toBeInTheDocument();
  });

  it('renders desktop draft compose content when target user id is present', () => {
    useIsMobile.mockReturnValue(false);

    render(<MessagesModule currentUserId={1} targetUserId={42} />);

    expect(screen.getByText('DraftConversationDetail:42')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });

  it('keeps the mobile list flow unchanged', () => {
    useIsMobile.mockReturnValue(true);

    render(<MessagesModule currentUserId={1} />);

    expect(screen.getByText('ConversationsList:none')).toBeInTheDocument();
    expect(screen.queryByText('Vaše správy')).not.toBeInTheDocument();
  });

  it('renders the draft compose detail on mobile too', () => {
    useIsMobile.mockReturnValue(true);

    render(<MessagesModule currentUserId={1} targetUserId={55} />);

    expect(screen.getByText('DraftConversationDetail:55')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });
});
