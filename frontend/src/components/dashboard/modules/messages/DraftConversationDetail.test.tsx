import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraftConversationDetail } from './DraftConversationDetail';
import { openConversation, sendDirectMessage } from './messagingApi';

jest.mock('@emoji-mart/data', () => ({}));

jest.mock('@emoji-mart/react', () => ({
  __esModule: true,
  default: ({ onEmojiSelect }: { onEmojiSelect: (value: { native: string }) => void }) => (
    <button
      type="button"
      onClick={() => onEmojiSelect({ native: String.fromCodePoint(0x1f642) })}
    >
      Mock emoji
    </button>
  ),
}));

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
  sendDirectMessage: jest.fn(),
  getMessagingErrorMessage: jest.fn(),
}));

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};
const createObjectURLMock = jest.fn();
const revokeObjectURLMock = jest.fn();

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
    createObjectURLMock.mockReturnValue('blob:draft-preview');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURLMock,
    });
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

  it('keeps the draft conversation root stretched to the available width on mobile', async () => {
    useIsMobile.mockReturnValue(true);
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);

    const { container } = render(<DraftConversationDetail targetUserId={42} />);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
    });

    expect(container.firstElementChild).toHaveClass('w-full');
    expect(container.firstElementChild).toHaveClass('max-w-4xl');
    expect(container.firstElementChild).toHaveClass('mx-auto');
  });

  it('uses the compact mobile composer spacing in the draft conversation', async () => {
    useIsMobile.mockReturnValue(true);
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);

    render(<DraftConversationDetail targetUserId={42} />);

    const composer = await screen.findByTestId('draft-conversation-composer');

    expect(composer.className).not.toContain('mt-1.5');
    expect(composer.className).not.toContain('pt-2');
    expect(composer.className).toContain('mt-1');
    expect(composer.className).toContain('pt-1');
  });

  it('sends the first draft message on the first mobile tap', async () => {
    useIsMobile.mockReturnValue(true);
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);
    (sendDirectMessage as jest.Mock).mockResolvedValue({ conversation_id: 91 });

    render(<DraftConversationDetail targetUserId={42} />);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
    });

    const input = (await screen.findByRole('textbox')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ahoj' } });
    fireEvent.focus(input);

    const sendButton = await screen.findByRole('button', { name: /odosla/i });
    const pointerDownEvent = createEvent.pointerDown(sendButton, { bubbles: true, cancelable: true });
    fireEvent(sendButton, pointerDownEvent);

    expect(pointerDownEvent.defaultPrevented).toBe(true);

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendDirectMessage).toHaveBeenCalledWith(42, 'Ahoj');
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/messages?conversationId=91');
    });
  });

  it('sends the first draft message with an attached image', async () => {
    const attachment = new File(['draft-image'], 'draft-photo.png', { type: 'image/png' });
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);
    (sendDirectMessage as jest.Mock).mockResolvedValue({ conversation_id: 91 });

    render(<DraftConversationDetail targetUserId={42} />);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
    });

    fireEvent.change(await screen.findByTestId('draft-image-picker-input'), {
      target: { files: [attachment] },
    });

    expect(await screen.findByTestId('message-composer-image-preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

    await waitFor(() => {
      expect(sendDirectMessage).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          text: '',
          image: attachment,
        }),
      );
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/messages?conversationId=91');
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:draft-preview');
    });
  });
});
