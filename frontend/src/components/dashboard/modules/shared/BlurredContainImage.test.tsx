jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn() },
}));

import { render, waitFor } from '@testing-library/react';
import { api } from '@/lib/api';
import BlurredContainImage from './BlurredContainImage';

describe('BlurredContainImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockReset();
    let counter = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: jest.fn(() => `blob:mock/${(counter += 1)}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
  });

  it('renders a public src directly for both layers without an api request', () => {
    const publicUrl = 'https://cdn.example.com/media/offers/1/x.webp';
    const { container } = render(<BlurredContainImage src={publicUrl} alt="Foto" />);

    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    imgs.forEach((img) => expect(img).toHaveAttribute('src', publicUrl));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('loads a protected image only once and shares one object URL for blur + main image', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: new Blob(['x'], { type: 'image/webp' }),
    });

    const { container } = render(
      <BlurredContainImage
        src="https://backend/api/auth/portfolio/5/images/13/file/?variant=medium"
        alt="Chranene foto"
      />,
    );

    await waitFor(() => {
      const imgs = container.querySelectorAll('img');
      expect(imgs).toHaveLength(2);
      imgs.forEach((img) => expect(img).toHaveAttribute('src', 'blob:mock/1'));
    });

    // Presne jeden request napriek dvom <img> (rozmazané pozadie + hlavný obrázok).
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
