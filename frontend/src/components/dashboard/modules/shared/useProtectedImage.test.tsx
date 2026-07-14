jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { api } from '@/lib/api';
import { useProtectedImage } from './useProtectedImage';

const PROTECTED_URL =
  'https://backend-http-svap.up.railway.app/api/auth/portfolio/5/images/13/file/?variant=medium';

describe('useProtectedImage', () => {
  const createObjectURL = jest.fn();
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockReset();
    let counter = 0;
    createObjectURL.mockImplementation(() => `blob:mock/${(counter += 1)}`);
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: revokeObjectURL });
  });

  it('returns the original src for a public image and never calls api', () => {
    const publicUrl = 'https://cdn.example.com/media/offers/1/x.webp';
    const { result } = renderHook(() => useProtectedImage(publicUrl));

    expect(result.current.resolvedSrc).toBe(publicUrl);
    expect(result.current.isProtected).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('loads a protected image through api as a blob and exposes an object URL', async () => {
    const blob = new Blob(['x'], { type: 'image/webp' });
    (api.get as jest.Mock).mockResolvedValue({ data: blob });

    const { result } = renderHook(() => useProtectedImage(PROTECTED_URL));

    await waitFor(() => expect(result.current.resolvedSrc).toBe('blob:mock/1'));
    expect(result.current.isProtected).toBe(true);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(
      '/auth/portfolio/5/images/13/file/?variant=medium',
      expect.objectContaining({ responseType: 'blob' }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('sets isError and keeps resolvedSrc null when the api request fails', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useProtectedImage(PROTECTED_URL));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isProtected).toBe(true);
    expect(result.current.isLoading).toBe(false);
    // Chránený obrázok zlyhal → žiadna object URL (neutrálny stav, req #10).
    expect(result.current.resolvedSrc).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('revokes the object URL on unmount', async () => {
    const blob = new Blob(['x'], { type: 'image/webp' });
    (api.get as jest.Mock).mockResolvedValue({ data: blob });

    const { result, unmount } = renderHook(() =>
      useProtectedImage(
        'https://backend/api/auth/portfolio/5/images/13/file/?variant=large',
      ),
    );
    await waitFor(() => expect(result.current.resolvedSrc).toBe('blob:mock/1'));

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/1');
  });
});
