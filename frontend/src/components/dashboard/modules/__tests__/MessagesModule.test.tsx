import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessagesModule from '../MessagesModule';

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
  useIsMobileState: jest.fn(),
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

const { useIsMobileState } = jest.requireMock('@/hooks') as {
  useIsMobileState: jest.Mock;
};

describe('MessagesModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useIsMobileState.mockReturnValue({
      isMobile: false,
      isResolved: true,
    });
  });

  it('renders desktop empty state without embedding the conversations rail', () => {
    render(<MessagesModule currentUserId={1} />);

    expect(screen.getByText(/Spr/)).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });

  it('renders desktop detail content without the in-module conversations rail', () => {
    render(<MessagesModule currentUserId={1} conversationId={7} />);

    expect(screen.getByText('ConversationDetail:7')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:7')).not.toBeInTheDocument();
  });

  it('renders desktop draft compose content when target user id is present', () => {
    render(<MessagesModule currentUserId={1} targetUserId={42} />);

    expect(screen.getByText('DraftConversationDetail:42')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });

  it('keeps the mobile list flow unchanged', () => {
    useIsMobileState.mockReturnValue({
      isMobile: true,
      isResolved: true,
    });

    render(<MessagesModule currentUserId={1} />);

    expect(screen.getByText('ConversationsList:none')).toBeInTheDocument();
    expect(screen.queryByText(/Spr/)).not.toBeInTheDocument();
  });

  it('renders the draft compose detail on mobile too', () => {
    useIsMobileState.mockReturnValue({
      isMobile: true,
      isResolved: true,
    });

    render(<MessagesModule currentUserId={1} targetUserId={55} />);

    expect(screen.getByText('DraftConversationDetail:55')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });

  it('stretches the mobile conversation detail flow to the full available height', () => {
    useIsMobileState.mockReturnValue({
      isMobile: true,
      isResolved: true,
    });

    render(<MessagesModule currentUserId={1} conversationId={7} />);

    const wrapper = screen.getByText('ConversationDetail:7').parentElement;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('h-full');
    expect(wrapper).toHaveClass('min-h-0');
    expect(wrapper).toHaveClass('w-full');
    expect(wrapper).toHaveClass('flex-col');
  });

  it('stretches the mobile draft compose flow to the full available height', () => {
    useIsMobileState.mockReturnValue({
      isMobile: true,
      isResolved: true,
    });

    render(<MessagesModule currentUserId={1} targetUserId={55} />);

    const wrapper = screen.getByText('DraftConversationDetail:55').parentElement;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('h-full');
    expect(wrapper).toHaveClass('min-h-0');
    expect(wrapper).toHaveClass('w-full');
    expect(wrapper).toHaveClass('flex-col');
  });

  it('shows only the safe loading fallback until the viewport is resolved', () => {
    useIsMobileState.mockReturnValue({
      isMobile: false,
      isResolved: false,
    });

    render(<MessagesModule currentUserId={1} />);

    expect(screen.getByTestId('conversations-list-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });
});


