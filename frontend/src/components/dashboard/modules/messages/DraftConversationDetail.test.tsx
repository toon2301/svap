import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraftConversationDetail } from './DraftConversationDetail';
import {
  getMessagingErrorCode,
  getMessagingErrorMessage,
  getMessagingErrorStatus,
  openConversation,
  sendDirectMessage,
} from './messagingApi';
import toast from 'react-hot-toast';
import {
  clearPassiveMessagingRefreshSuppression,
  isPassiveMessagingRefreshSuppressed,
} from './messagesEvents';

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
  getMessagingErrorCode: jest.fn((error) => {
    const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
    return typeof code === 'string' ? code : null;
  }),
  getMessagingErrorStatus: jest.fn((error) => {
    const status = (error as { response?: { status?: unknown } })?.response?.status;
    return typeof status === 'number' ? status : null;
  }),
  getMessagingErrorMessage: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
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
    clearPassiveMessagingRefreshSuppression();
    useIsMobile.mockReturnValue(false);
    (getMessagingErrorCode as jest.Mock).mockImplementation((error) => {
      const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
      return typeof code === 'string' ? code : null;
    });
    (getMessagingErrorStatus as jest.Mock).mockImplementation((error) => {
      const status = (error as { response?: { status?: unknown } })?.response?.status;
      return typeof status === 'number' ? status : null;
    });
    (getMessagingErrorMessage as jest.Mock).mockReturnValue('Friendly messaging error');
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

  it('suppresses passive refreshes after a forbidden send error', async () => {
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);
    (sendDirectMessage as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 403,
        data: {},
      },
    });

    render(<DraftConversationDetail targetUserId={42} />);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
    });

    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Tretia sprava' } });
    fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Friendly messaging error');
    });

    expect(isPassiveMessagingRefreshSuppressed()).toBe(true);
    expect(window.location.pathname + window.location.search).not.toBe(
      '/dashboard/messages?conversationId=91',
    );
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
      expect(window.location.pathname + window.location.search).toBe(
        '/dashboard/messages?conversationId=77',
      );
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
      expect(window.location.pathname + window.location.search).toBe(
        '/dashboard/messages?conversationId=91',
      );
    });
  });

  it('keeps the desktop draft send button compact and bottom-aligned when an image preview is shown', async () => {
    const attachment = new File(['draft-image'], 'draft-photo.png', { type: 'image/png' });
    (openConversation as jest.Mock).mockResolvedValue(draftResponse);

    render(<DraftConversationDetail targetUserId={42} />);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
    });

    fireEvent.change(await screen.findByTestId('draft-image-picker-input'), {
      target: { files: [attachment] },
    });

    await screen.findByTestId('message-composer-image-preview');

    const composer = screen.getByTestId('draft-conversation-composer');
    expect(composer.className).toContain('items-end');

    const sendButton = screen.getByRole('button', { name: /odosla/i });
    expect(sendButton.className).toContain('self-end');
    expect(sendButton.className).toContain('shrink-0');
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

    const preview = await screen.findByTestId('message-composer-image-preview');
    const previewImage = within(preview).getByRole('img');
    expect(previewImage.className).toContain('object-contain');
    expect(previewImage.className).not.toContain('object-cover');
    expect(previewImage.className).toContain('max-h-40');

    fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

    await waitFor(() => {
      expect(sendDirectMessage).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          text: '',
          image: attachment,
        }),
      );
      expect(window.location.pathname + window.location.search).toBe(
        '/dashboard/messages?conversationId=91',
      );
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:draft-preview');
    });
  });
});
