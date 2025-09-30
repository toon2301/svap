import { renderHook, act } from '@testing-library/react';
import { useApi, useAuthApi, useProfileApi } from '../useApi';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock useErrorHandler
const mockHandleError = jest.fn();
jest.mock('../useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}));

// Mock useLoading
const mockStartLoading = jest.fn();
const mockStopLoading = jest.fn();
jest.mock('@/contexts/LoadingContext', () => ({
  useLoading: () => ({
    startLoading: mockStartLoading,
    stopLoading: mockStopLoading,
  }),
}));

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inicializuje s prázdnymi hodnotami', () => {
    const { result } = renderHook(() => useApi());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('vykonáva GET požiadavku', async () => {
    const mockResponse = { data: { message: 'Success' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.get('/test');
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'GET',
      url: '/test',
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(result.current.data).toEqual(mockResponse.data);
    expect(result.current.loading).toBe(false);
  });

  it('vykonáva POST požiadavku', async () => {
    const mockResponse = { data: { message: 'Created' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.post('/test', { name: 'Test' });
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'POST',
      url: '/test',
      data: { name: 'Test' },
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(result.current.data).toEqual(mockResponse.data);
  });

  it('vykonáva PUT požiadavku', async () => {
    const mockResponse = { data: { message: 'Updated' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.put('/test/1', { name: 'Updated' });
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/test/1',
      data: { name: 'Updated' },
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('vykonáva PATCH požiadavku', async () => {
    const mockResponse = { data: { message: 'Patched' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.patch('/test/1', { name: 'Patched' });
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'PATCH',
      url: '/test/1',
      data: { name: 'Patched' },
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('vykonáva DELETE požiadavku', async () => {
    const mockResponse = { data: { message: 'Deleted' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.delete('/test/1');
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/test/1',
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('spracováva chyby', async () => {
    const mockError = {
      response: {
        data: {
          message: 'Error message'
        }
      }
    };
    mockedAxios.mockRejectedValue(mockError);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.get('/test');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Error message');
    expect(mockHandleError).toHaveBeenCalledWith(mockError);
    expect(result.current.loading).toBe(false);
  });

  it('resetuje stav', () => {
    const { result } = renderHook(() => useApi());

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('nastavuje loading stav počas požiadavky', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedAxios.mockReturnValue(promise);

    const { result } = renderHook(() => useApi());

    act(() => {
      result.current.get('/test');
    });

    expect(result.current.loading).toBe(true);
    expect(mockStartLoading).toHaveBeenCalledWith('Načítavam...');

    await act(async () => {
      resolvePromise!({ data: { message: 'Success' } });
    });

    expect(result.current.loading).toBe(false);
    expect(mockStopLoading).toHaveBeenCalled();
  });
});

describe('useAuthApi', () => {
  it('poskytuje auth špecifické funkcie', () => {
    const { result } = renderHook(() => useAuthApi());

    expect(result.current.login).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.verifyEmail).toBeDefined();
    expect(result.current.refreshToken).toBeDefined();
    expect(result.current.logout).toBeDefined();
  });

  it('vykonáva login', async () => {
    const mockResponse = { data: { message: 'Login success' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuthApi());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'POST',
      url: '/auth/login/',
      data: { email: 'test@example.com', password: 'password' },
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
});

describe('useProfileApi', () => {
  it('poskytuje profile špecifické funkcie', () => {
    const { result } = renderHook(() => useProfileApi());

    expect(result.current.getProfile).toBeDefined();
    expect(result.current.updateProfile).toBeDefined();
  });

  it('vykonáva getProfile', async () => {
    const mockResponse = { data: { message: 'Profile data' } };
    mockedAxios.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useProfileApi());

    await act(async () => {
      await result.current.getProfile();
    });

    expect(mockedAxios).toHaveBeenCalledWith({
      method: 'GET',
      url: '/profile/',
      baseURL: 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
});
