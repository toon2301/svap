'use client';

import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatRequestOfferPicker } from './ChatRequestOfferPicker';

const mockApiGet = jest.fn();
const mockPush = jest.fn();
const mockTranslate = (_key: string, defaultValue: string) => defaultValue;

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: mockTranslate,
  }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
  endpoints: {
    dashboard: {
      userSkills: (id: number) => `/auth/dashboard/users/${id}/skills/`,
    },
  },
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div data-testid="offer-image-carousel">{alt}</div>,
}));

function Harness({
  targetUserId = 77,
  targetUserSlug = 'tester-slug',
  targetUserType = 'business',
}: {
  targetUserId?: number | null;
  targetUserSlug?: string | null;
  targetUserType?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ChatRequestOfferPicker
      open={open}
      onToggle={() => setOpen((current) => !current)}
      disabled={!targetUserId}
      isMobile
      targetUserId={targetUserId}
      targetUserSlug={targetUserSlug}
      targetUserType={targetUserType}
    />
  );
}

describe('ChatRequestOfferPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/dashboard/messages');
  });

  it('loads requestable offers on demand and opens the highlighted profile card on selection', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        {
          id: 11,
          category: 'IT',
          subcategory: 'Frontend',
          description: 'Frontend mentoring',
          is_seeking: false,
          images: [],
        },
        {
          id: 12,
          category: 'Pomoc',
          subcategory: 'Konzultacia',
          description: 'Hladam pomoc',
          is_seeking: true,
          images: [],
        },
      ],
    });

    const profileEventSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileEventSpy as EventListener);

    render(<Harness />);

    expect(mockApiGet).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('chat-request-offer-picker-toggle'));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/auth/dashboard/users/77/skills/');
    });

    expect(await screen.findByTestId('chat-offer-preview-card-11')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-offer-preview-card-12')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-offer-preview-card-11'));

    await waitFor(() => {
      expect(profileEventSpy).toHaveBeenCalledTimes(1);
    });

    const [event] = profileEventSpy.mock.calls[0] as [CustomEvent];
    expect(event.detail).toMatchObject({
      identifier: 'tester-slug',
      highlightId: 11,
    });
    expect(mockPush).not.toHaveBeenCalled();

    window.removeEventListener('goToUserProfile', profileEventSpy as EventListener);
  });

  it('reuses the already loaded offers when the picker is reopened', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        {
          id: 21,
          category: 'Jazyky',
          subcategory: 'Nemcina',
          description: 'Konverzacie',
          is_seeking: false,
          images: [],
        },
      ],
    });

    render(<Harness />);

    const toggle = screen.getByTestId('chat-request-offer-picker-toggle');

    fireEvent.click(toggle);

    expect(await screen.findByTestId('chat-offer-preview-card-21')).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledTimes(1);

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByTestId('chat-offer-preview-card-21')).toBeInTheDocument();
    });
    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });
});
