import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePortfolioSection from './ProfilePortfolioSection';
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
  ...jest.requireActual('@/lib/api'),
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

function portfolioItem(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id: 1,
    title: 'Featured Work',
    category: 'portfolio-a-prezentacia-prace',
    sort_order: 1,
    cover_image: {
      id: 10,
      thumbnail_url: '/media/thumb.webp',
      medium_url: '/media/medium.webp',
      large_url: '/media/large.webp',
      image_url: '/media/original.webp',
    },
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

describe('ProfilePortfolioSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    (api.post as jest.Mock).mockReset();
  });

  it('fetches portfolio only when the portfolio tab is active', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    const { rerender } = render(
      <ProfilePortfolioSection activeTab="offers" isOtherUserProfile={false} ownerUserId={1} />,
    );

    expect(api.get).not.toHaveBeenCalled();

    rerender(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auth/portfolio/');
    });
    expect(await screen.findByText('Portfólio je zatiaľ prázdne')).toBeInTheDocument();
  });

  it('shows skeleton loading while portfolio is loading', async () => {
    const pending = deferred<{ data: PortfolioItem[] }>();
    (api.get as jest.Mock).mockReturnValue(pending.promise);

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByTestId('portfolio-section-skeleton')).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ data: [] });
    });
  });

  it('shows owner empty state with a working create action', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByText('Portfólio je zatiaľ prázdne')).toBeInTheDocument();
    expect(screen.getByText('Pridaj prvú ukážku práce a ukáž, čo vieš.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vytvoriť portfólio' }));
    expect(screen.getByTestId('portfolio-create-form')).toBeInTheDocument();
  });

  it('shows visitor empty state and uses the slug portfolio endpoint when available', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(
      <ProfilePortfolioSection
        activeTab="portfolio"
        isOtherUserProfile
        ownerUserId={42}
        ownerSlug="jane-doe"
      />,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auth/dashboard/users/slug/jane-doe/portfolio/');
    });
    expect(await screen.findByText('Portfólio zatiaľ nie je dostupné')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vytvoriť portfólio' })).not.toBeInTheDocument();
  });

  it('validates required fields before creating portfolio', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vytvoriť portfólio' }));
    fireEvent.submit(screen.getByTestId('portfolio-create-form'));

    expect(await screen.findByText('Názov je povinný')).toBeInTheDocument();
    expect(screen.getByText('Kategória je povinná')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a portfolio item and navigates to its detail', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    (api.post as jest.Mock).mockResolvedValue({
      data: portfolioItem({
        id: 9,
        title: 'New Work',
        category: 'it-a-technologie',
        description: 'New description',
        sort_order: 2,
      }),
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vytvoriť portfólio' }));
    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: ' New Work ' } });
    fireEvent.change(screen.getByLabelText('Kategória'), { target: { value: 'it-a-technologie' } });
    fireEvent.change(screen.getByLabelText(/Popis/), { target: { value: ' New description ' } });
    fireEvent.submit(screen.getByTestId('portfolio-create-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/portfolio/', {
        title: 'New Work',
        category: 'it-a-technologie',
        description: 'New description',
      });
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/1/portfolio/9');
  });

  it('shows a safe create error when the backend rejects the request', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    (api.post as jest.Mock).mockRejectedValue({
      response: { status: 403, data: { detail: 'Forbidden' } },
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vytvoriť portfólio' }));
    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'New Work' } });
    fireEvent.change(screen.getByLabelText('Kategória'), { target: { value: 'it-a-technologie' } });
    fireEvent.submit(screen.getByTestId('portfolio-create-form'));

    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows an error state with retry', async () => {
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ data: [portfolioItem()] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByText('Portfólio sa nepodarilo načítať')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));

    expect(await screen.findByTestId('portfolio-featured-card')).toHaveTextContent('Featured Work');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('renders the first item as featured and the remaining items in the grid', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        portfolioItem({ id: 1, title: 'First Work' }),
        portfolioItem({ id: 2, title: 'Second Work', cover_image: null }),
        portfolioItem({ id: 3, title: 'Third Work', cover_image: null }),
      ],
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByTestId('portfolio-featured-card')).toHaveTextContent('First Work');
    expect(screen.getByTestId('portfolio-grid')).toBeInTheDocument();
    expect(screen.getAllByTestId('portfolio-grid-card')).toHaveLength(2);
  });

  it('uses thumbnail URLs in profile cards instead of large image URLs', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [portfolioItem()] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    const image = await screen.findByRole('img', { name: 'Featured Work' });
    expect(image).toHaveAttribute('src', '/media/thumb.webp');
    expect(image).not.toHaveAttribute('src', '/media/large.webp');
  });

  it('opens the correct detail route when the featured card is clicked', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [portfolioItem({ id: 7 })] });

    render(
      <ProfilePortfolioSection
        activeTab="portfolio"
        isOtherUserProfile
        ownerUserId={7}
        ownerSlug="jane-doe"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Featured Work' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/jane-doe/portfolio/7');
  });

  it('opens the correct detail route when a grid card is clicked', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        portfolioItem({ id: 1, title: 'First Work' }),
        portfolioItem({ id: 2, title: 'Second Work', cover_image: null }),
      ],
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile ownerUserId={42} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Second Work' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/42/portfolio/2');
  });
});
