jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn() },
}));

import { fireEvent, render, waitFor } from '@testing-library/react';
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

  // Nález 91: pri verejnej adrese nebola ošetrená chyba načítania, takže po zmazaní fotky ostal pokazený obrázok.
  describe('onError', () => {
    const publicUrl = 'https://cdn.example.com/media/offers/1/x.webp';
    const protectedUrl = 'https://backend/api/auth/portfolio/5/images/13/file/?variant=medium';

    it('is called when a public image fails to load', () => {
      const onError = jest.fn();
      const { container } = render(<BlurredContainImage src={publicUrl} alt="Foto" onError={onError} />);

      // Prehliadač pošle `error` obom vrstvám; rodič sa dozvie o zlyhaní aspoň raz.
      container.querySelectorAll('img').forEach((img) => fireEvent.error(img));

      expect(onError).toHaveBeenCalled();
    });

    it('is not called for a public image that loads', () => {
      const onError = jest.fn();
      const { container } = render(<BlurredContainImage src={publicUrl} alt="Foto" onError={onError} />);

      container.querySelectorAll('img').forEach((img) => fireEvent.load(img));

      expect(onError).not.toHaveBeenCalled();
    });

    it('is called once when a protected image cannot be fetched', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Not found'));
      const onError = jest.fn();

      const { container } = render(<BlurredContainImage src={protectedUrl} alt="Chranene foto" onError={onError} />);

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      // Chránený obrázok bez dát sa nevykreslí vôbec (ostáva neutrálne pozadie).
      expect(container.querySelectorAll('img')).toHaveLength(0);
    });

    it('is not called when a protected image is fetched successfully', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: new Blob(['x'], { type: 'image/webp' }) });
      const onError = jest.fn();

      const { container } = render(<BlurredContainImage src={protectedUrl} alt="Chranene foto" onError={onError} />);

      await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2));
      expect(onError).not.toHaveBeenCalled();
    });

    it('is optional: a failed image without it does not throw', () => {
      const { container } = render(<BlurredContainImage src={publicUrl} alt="Foto" />);

      expect(() => {
        container.querySelectorAll('img').forEach((img) => fireEvent.error(img));
      }).not.toThrow();
    });
  });
});
