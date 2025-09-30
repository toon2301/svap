import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAuthGuard, useRequireAuth, useRequireVerification, useRequireProfile } from '../useAuthGuard';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock AuthContext
const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_verified: true,
};

const mockUnverifiedUser = {
  ...mockUser,
  is_verified: false,
};

const mockIncompleteUser = {
  ...mockUser,
  first_name: '',
  last_name: '',
};

const mockAuthContext = {
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshUser: jest.fn(),
};

const mockUseAuth = jest.fn(() => mockAuthContext);
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useAuthGuard', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('vracia používateľa a stav keď je prihlásený', () => {
    mockUseAuth.mockReturnValue(mockAuthContext);
    const { result } = renderHook(() => useAuthGuard());

    expect(result.current.user).toBe(mockUser);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isVerified).toBe(true);
    expect(result.current.hasCompleteProfile).toBe(true);
  });

  it('presmeruje na login keď nie je prihlásený', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false
    });

    const { result } = renderHook(() => useAuthGuard());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('presmeruje na verify-email keď nie je overený', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUnverifiedUser,
      isLoading: false
    });

    const { result } = renderHook(() => useAuthGuard({ requireVerification: true }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockPush).toHaveBeenCalledWith('/verify-email');
  });

  it('presmeruje na profile/edit keď nemá kompletný profil', async () => {
    mockUseAuth.mockReturnValue({
      user: mockIncompleteUser,
      isLoading: false
    });

    const { result } = renderHook(() => useAuthGuard({ requireProfile: true }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('používa vlastný redirectTo', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false
    });

    const { result } = renderHook(() => useAuthGuard({ redirectTo: '/custom-login' }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockPush).toHaveBeenCalledWith('/custom-login');
  });
});

describe('useRequireAuth', () => {
  it('je alias pre useAuthGuard', () => {
    mockUseAuth.mockReturnValue(mockAuthContext);
    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('useRequireVerification', () => {
  it('je alias pre useAuthGuard s requireVerification', () => {
    mockUseAuth.mockReturnValue(mockAuthContext);
    const { result } = renderHook(() => useRequireVerification());

    expect(result.current.user).toBe(mockUser);
    expect(result.current.isVerified).toBe(true);
  });
});

describe('useRequireProfile', () => {
  it('je alias pre useAuthGuard s requireProfile', () => {
    mockUseAuth.mockReturnValue(mockAuthContext);
    const { result } = renderHook(() => useRequireProfile());

    expect(result.current.user).toBe(mockUser);
    expect(result.current.hasCompleteProfile).toBe(true);
  });
});
