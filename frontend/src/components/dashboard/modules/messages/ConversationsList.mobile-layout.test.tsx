'use client';

/**
 * Rozloženie zoznamu konverzácií na mobile: prepínač Správy | Žiadosti, tlačidlo skupiny a pole
 * vyhľadávania sú obyčajná súčasť obsahu a pri scrolle odscrollujú spolu so zoznamom. Nič sa
 * nelepí pod nadpis a neplynie po zozname.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import { listConversations, listMessageRequests } from './messagingApi';
import { listConversationsPage } from './conversationsPagingApi';
import { legacyListAsPages } from './conversationsPagingTestUtils';

let mockIsMobile = true;

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: () => mockIsMobile,
}));

jest.mock('./messagingApi', () => ({
  __esModule: true,
  listConversations: jest.fn(),
  listMessageRequests: jest.fn().mockResolvedValue([]),
  hideConversation: jest.fn(),
  createGroupConversation: jest.fn(),
  listGroupMemberCandidates: jest.fn(),
  getMessagingErrorMessage: jest.fn((_error, options) => options?.fallback || 'Messaging error'),
  updateConversationPinnedState: jest.fn(),
}));

jest.mock('./conversationsPagingApi', () => ({
  ...jest.requireActual('./conversationsPagingApi'),
  listConversationsPage: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/messageUnreadStore', () => ({
  __esModule: true,
  publishMessageUnreadCount: jest.fn(),
  syncMessageUnreadCountFromConversations: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
}));

jest.mock('../profile/ReportUserModal', () => ({
  __esModule: true,
  ReportUserModal: () => null,
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn() }),
}));

const conversation = (id: number) => ({
  id,
  other_user: { id: 100 + id, display_name: `Používateľ ${id}`, slug: `user-${id}` },
  last_message_preview: 'Ahoj',
  last_message_at: '2026-01-01T10:00:00Z',
  last_read_at: null,
  has_unread: false,
  unread_count: 0,
  updated_at: '2026-01-01T10:00:00Z',
});

async function renderList(variant: 'default' | 'rail' = 'default') {
  const view = render(<ConversationsList currentUserId={1} variant={variant} />);
  await screen.findByText('Používateľ 1');
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMobile = true;
  (listConversations as jest.Mock).mockResolvedValue([conversation(1), conversation(2)]);
  (listConversationsPage as jest.Mock).mockImplementation(
    legacyListAsPages(
      (params) => (listConversations as jest.Mock)(params),
      (params) => (listMessageRequests as jest.Mock)(params),
    ),
  );
});

describe('mobilný zoznam konverzácií', () => {
  it('nemá nič prilepené: žiadny prvok nie je sticky', async () => {
    const { container } = await renderList();

    expect(container.querySelectorAll('.sticky')).toHaveLength(0);
  });

  it('pole vyhľadávania je obyčajná súčasť obsahu, nie plávajúca vrstva', async () => {
    await renderList();

    const wrapper = screen.getByRole('textbox').parentElement as HTMLElement;

    expect(wrapper.className).not.toMatch(/sticky|top-0|z-20|backdrop-blur|bg-white\/95/);
    expect(wrapper).toHaveClass('mx-3');
  });

  it('vyhľadávanie je v poradí hneď za prepínačom a tlačidlom skupiny a pred zoznamom', async () => {
    await renderList();
    const search = screen.getByRole('textbox');
    const createGroup = screen.getByRole('button', { name: /vytvoriť skupinu/i });
    const firstRow = screen.getByText('Používateľ 1');

    expect(
      createGroup.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      search.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('prepínač a tlačidlo skupiny sú v tom istom toku ako pole vyhľadávania', async () => {
    await renderList();
    const search = screen.getByRole('textbox');
    const createGroup = screen.getByRole('button', { name: /vytvoriť skupinu/i });

    expect(search.closest('div[class*="max-w-4xl"]')).toBe(
      createGroup.closest('div[class*="max-w-4xl"]'),
    );
  });
});

describe('ostatné rozloženia ostávajú bez prilepeného vyhľadávania', () => {
  it('desktopový rail', async () => {
    mockIsMobile = false;
    const { container } = await renderList('rail');

    expect(container.querySelectorAll('.sticky')).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('textbox').parentElement).not.toHaveClass('mx-3'));
  });

  it('desktop (predvolený variant mimo mobilu)', async () => {
    mockIsMobile = false;
    const { container } = await renderList();

    expect(container.querySelectorAll('.sticky')).toHaveLength(0);
  });
});
