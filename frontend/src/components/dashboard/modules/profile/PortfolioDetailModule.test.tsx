import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PortfolioDetailModule from './PortfolioDetailModule';
import { api } from '@/lib/api';
import type { PortfolioItem } from './portfolioTypes';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
  },
  endpoints: {
    portfolio: {
      detail: (id: number) => `/auth/portfolio/${id}/`,
    },
  },
}));

function portfolioItem(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id: 7,
    title: 'Portfolio Detail',
    category: 'portfolio-a-prezentacia-prace',
    description: 'Detail description',
    sort_order: 1,
    related_offer: null,
    cover_image: {
      id: 1,
      thumbnail_url: '/media/thumb-1.webp',
      medium_url: '/media/medium-1.webp',
      large_url: '/media/large-1.webp',
      image_url: '/media/original-1.webp',
      order: 0,
    },
    images: [
      {
        id: 1,
        thumbnail_url: '/media/thumb-1.webp',
        medium_url: '/media/medium-1.webp',
        large_url: '/media/large-1.webp',
        image_url: '/media/original-1.webp',
        order: 0,
      },
      {
        id: 2,
        thumbnail_url: '/media/thumb-2.webp',
        medium_url: '/media/medium-2.webp',
        large_url: '/media/large-2.webp',
        image_url: '/media/original-2.webp',
        order: 1,
      },
    ],
    ...overrides,
  };
}

/** Creates a promise whose resolve/reject can be controlled by the test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('PortfolioDetailModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    document.body.style.overflow = '';
  });

  it('fetches the portfolio detail endpoint and renders data', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(screen.getByText('Detail description')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/portfolio/7/');
  });

  it('shows skeleton loading while detail is loading', async () => {
    const pending = deferred<{ data: PortfolioItem }>();
    (api.get as jest.Mock).mockReturnValue(pending.promise);

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByTestId('portfolio-detail-skeleton')).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ data: portfolioItem() });
    });
  });

  it('shows error state and retries loading', async () => {
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfólio sa nepodarilo načítať')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('always navigates back to the owner portfolio list', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: /Späť/ }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/jane-doe/portfolio');
  });

  it('uses medium URLs for the hero and gallery images', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const images = await screen.findAllByRole('img', { name: /Portfolio Detail/ });
    expect(images[0]).toHaveAttribute('src', '/media/medium-1.webp');
    expect(images[1]).toHaveAttribute('src', '/media/medium-1.webp');
    expect(images[2]).toHaveAttribute('src', '/media/medium-2.webp');
  });

  it('renders all gallery photos', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByTestId('portfolio-detail-gallery')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Portfolio Detail Fotka/ })).toHaveLength(2);
  });

  it('opens the lightbox with the large URL and closes with X', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const heroImage = (await screen.findAllByRole('img', { name: 'Portfolio Detail' }))[0];
    fireEvent.click(heroImage.closest('button') as HTMLElement);

    const dialog = await screen.findByRole('dialog', { name: 'Galéria' });
    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-1.webp',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Zavrieť' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Galéria' })).not.toBeInTheDocument();
    });
  });

  it('closes the lightbox with Escape', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const heroImage = (await screen.findAllByRole('img', { name: 'Portfolio Detail' }))[0];
    fireEvent.click(heroImage.closest('button') as HTMLElement);
    expect(await screen.findByRole('dialog', { name: 'Galéria' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Galéria' })).not.toBeInTheDocument();
    });
  });

  it('switches photos with arrow buttons', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const heroImage = (await screen.findAllByRole('img', { name: 'Portfolio Detail' }))[0];
    fireEvent.click(heroImage.closest('button') as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'Galéria' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ďalšia fotka' }));

    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-2.webp',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Predchádzajúca fotka' }));

    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-1.webp',
    );
  });

  it('switches photos with mobile swipe gestures', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const heroImage = (await screen.findAllByRole('img', { name: 'Portfolio Detail' }))[0];
    fireEvent.click(heroImage.closest('button') as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'Galéria' });
    const imageContainer = within(dialog).getByRole('img', { name: 'Portfolio Detail' }).parentElement as HTMLElement;

    fireEvent.touchStart(imageContainer, { touches: [{ clientX: 200, clientY: 20 }] });
    fireEvent.touchEnd(imageContainer, { changedTouches: [{ clientX: 80, clientY: 25 }] });

    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-2.webp',
    );

    fireEvent.touchStart(imageContainer, { touches: [{ clientX: 80, clientY: 20 }] });
    fireEvent.touchEnd(imageContainer, { changedTouches: [{ clientX: 200, clientY: 25 }] });

    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-1.webp',
    );
  });

  it('renders related offer only when it exists', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: portfolioItem() });
    const { rerender } = render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await waitFor(() => {
      expect(screen.queryByText('Súvisiaca ponuka')).not.toBeInTheDocument();
    });

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: portfolioItem({
        id: 8,
        related_offer: {
          id: 12,
          category: 'portfolio-a-prezentacia-prace',
          subcategory: null,
          is_seeking: false,
        },
      }),
    });

    rerender(<PortfolioDetailModule itemId={8} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Súvisiaca ponuka')).toBeInTheDocument();
  });
});
