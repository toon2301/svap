import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessagesDesktopRail } from './MessagesDesktopRail';

jest.mock('./ConversationsList', () => ({
  __esModule: true,
  ConversationsList: ({ selectedConversationId }: { selectedConversationId?: number | null }) => (
    <div>ConversationsList:{selectedConversationId ?? 'none'}</div>
  ),
}));

describe('MessagesDesktopRail', () => {
  it('renders the right rail heading and selected conversation list', () => {
    render(<MessagesDesktopRail currentUserId={1} selectedConversationId={9} />);

    expect(screen.getByText('Správy')).toBeInTheDocument();
    expect(screen.getByText('Zoznam konverzácií')).toBeInTheDocument();
    expect(screen.getByText('ConversationsList:9')).toBeInTheDocument();
  });
});
