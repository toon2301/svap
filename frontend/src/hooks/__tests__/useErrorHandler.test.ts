import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => {
  const mockError = jest.fn();
  const mockSuccess = jest.fn();
  const mockToast = jest.fn();
  
  return {
    __esModule: true,
    default: Object.assign(mockToast, {
      error: mockError,
      success: mockSuccess,
    }),
    error: mockError,
    success: mockSuccess,
    warning: jest.fn(),
    info: jest.fn(),
  };
});

describe('useErrorHandler', () => {
  let mockError: jest.Mock;
  let mockSuccess: jest.Mock;
  let mockToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const toast = require('react-hot-toast');
    mockError = toast.error;
    mockSuccess = toast.success;
    mockToast = toast.default;
  });

  it('poskytuje všetky potrebné funkcie', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.handleError).toBeDefined();
    expect(result.current.showError).toBeDefined();
    expect(result.current.showSuccess).toBeDefined();
    expect(result.current.showWarning).toBeDefined();
    expect(result.current.showInfo).toBeDefined();
  });

  it('spracováva chyby s response.data', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    const error = {
      response: {
        data: {
          message: 'Test error message',
          code: 'TEST_ERROR'
        }
      }
    };

    act(() => {
      result.current.handleError(error);
    });

    expect(mockError).toHaveBeenCalledWith('TEST_ERROR: Test error message');
  });

  it('spracováva chyby s message', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    const error = {
      message: 'Simple error message'
    };

    act(() => {
      result.current.handleError(error);
    });

    expect(mockError).toHaveBeenCalledWith('Chyba: Simple error message');
  });

  it('spracováva string chyby', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    act(() => {
      result.current.handleError('String error');
    });

    expect(mockError).toHaveBeenCalledWith('Chyba: String error');
  });

  it('spracováva neznáme chyby', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    act(() => {
      result.current.handleError({});
    });

    expect(mockError).toHaveBeenCalledWith('Chyba: Nastala neočakávaná chyba');
  });

  it('zobrazuje error toast', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    act(() => {
      result.current.showError('Test error', 'Custom Title');
    });

    expect(mockError).toHaveBeenCalledWith('Custom Title: Test error');
  });

  it('zobrazuje success toast', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    act(() => {
      result.current.showSuccess('Test success', 'Custom Title');
    });

    expect(mockSuccess).toHaveBeenCalledWith('Custom Title: Test success');
  });

  it('zobrazuje warning toast', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showWarning('Test warning', 'Custom Title');
    });

    expect(mockToast).toHaveBeenCalledWith('Custom Title: Test warning', {
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    });
  });

  it('zobrazuje info toast', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.showInfo('Test info', 'Custom Title');
    });

    expect(mockToast).toHaveBeenCalledWith('Custom Title: Test info', {
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    });
  });

  it('používa default tituly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const toast = require('react-hot-toast');

    act(() => {
      result.current.showError('Test error');
    });

    expect(mockError).toHaveBeenCalledWith('Chyba: Test error');
  });
});
