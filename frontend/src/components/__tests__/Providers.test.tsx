import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({
  Toaster: jest.fn().mockReturnValue(null),
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}));

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseIsMobileState = jest.fn();
jest.mock('@/hooks/useIsMobile', () => ({
  useIsMobileState: () => mockUseIsMobileState(),
}));

import { Toaster } from 'react-hot-toast';
import { Providers } from '../providers';

const MockedToaster = Toaster as unknown as jest.Mock;

// Helper: render + flush useEffect so mounted=true and portal appears
async function renderProviders(children = <div />) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<Providers>{children}</Providers>);
  });
  return result!;
}

describe('Providers – Toaster configuration', () => {
  beforeEach(() => {
    MockedToaster.mockClear();
    mockUseIsMobileState.mockReturnValue({ isMobile: false, isResolved: true });
  });

  it('renderuje Toaster s containerClassName toast-modern', async () => {
    await renderProviders();
    expect(MockedToaster).toHaveBeenCalledWith(
      expect.objectContaining({ containerClassName: 'toast-modern' }),
      expect.anything(),
    );
  });

  it('containerStyle má position fixed', async () => {
    await renderProviders();
    const [props] = MockedToaster.mock.calls[0] as [Record<string, unknown>];
    expect((props.containerStyle as React.CSSProperties).position).toBe('fixed');
  });

  it('containerStyle má zIndex 10050', async () => {
    await renderProviders();
    const [props] = MockedToaster.mock.calls[0] as [Record<string, unknown>];
    expect((props.containerStyle as React.CSSProperties).zIndex).toBe(10050);
  });

  it('používa top-right na desktope', async () => {
    mockUseIsMobileState.mockReturnValue({ isMobile: false, isResolved: true });
    await renderProviders();
    expect(MockedToaster).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-right' }),
      expect.anything(),
    );
  });

  it('používa top-center na mobile', async () => {
    mockUseIsMobileState.mockReturnValue({ isMobile: true, isResolved: true });
    await renderProviders();
    expect(MockedToaster).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-center' }),
      expect.anything(),
    );
  });

  it('pred rozlíšením viewportu (isResolved=false) používa top-right', async () => {
    mockUseIsMobileState.mockReturnValue({ isMobile: true, isResolved: false });
    await renderProviders();
    expect(MockedToaster).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-right' }),
      expect.anything(),
    );
  });
});
