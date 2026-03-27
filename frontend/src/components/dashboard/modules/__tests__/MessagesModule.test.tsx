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

    expect(screen.getAllByText('Správy').length).toBeGreaterThan(0);
    expect(screen.getByText('Vyber konverzáciu')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:none')).not.toBeInTheDocument();
  });

  it('renders desktop detail content without the in-module conversations rail', () => {
    useIsMobile.mockReturnValue(false);

    render(<MessagesModule currentUserId={1} conversationId={7} />);

    expect(screen.getByText('ConversationDetail:7')).toBeInTheDocument();
    expect(screen.queryByText('ConversationsList:7')).not.toBeInTheDocument();
  });

  it('keeps the mobile list flow unchanged', () => {
    useIsMobile.mockReturnValue(true);

    render(<MessagesModule currentUserId={1} />);

    expect(screen.getByText('ConversationsList:none')).toBeInTheDocument();
    expect(screen.queryByText('Vyber konverzáciu')).not.toBeInTheDocument();
  });
});
