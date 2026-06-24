import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProfilePortfolioSection from './ProfilePortfolioSection';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { PortfolioItem } from './portfolioTypes';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ...jest.requireActual('@/lib/api'),
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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

function mockViewport(isMobile: boolean) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: query === '(max-width: 1023px)' ? isMobile : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

function selectFirstPortfolioCategory() {
  fireEvent.click(screen.getByLabelText(/Kateg.ria/i));
  const listbox = screen.getByRole('listbox', { name: /Kateg.ria/i });
  fireEvent.click(within(listbox).getAllByRole('option')[0]);
}

function clickNextStep() {
  fireEvent.click(screen.getByRole('button', { name: /alej|Next/i }));
}

function fillDesktopTitle(value = 'New Work') {
  fireEvent.change(screen.getByLabelText(/N.zov/i), { target: { value } });
  clickNextStep();
}

function advanceToDesktopDescriptionStep(title = 'New Work') {
  fillDesktopTitle(title);
  selectFirstPortfolioCategory();
  clickNextStep();
}

function advanceToDesktopPhotosStep(title = 'New Work', description?: string) {
  advanceToDesktopDescriptionStep(title);
  if (description !== undefined) {
    fireEvent.change(screen.getByRole('textbox', { name: /^Popis$/i }), { target: { value: description } });
  }
  clickNextStep();
}

describe('ProfilePortfolioSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockViewport(false);
    mockPush.mockClear();
    (api.post as jest.Mock).mockReset();
    (api.patch as jest.Mock).mockReset();
    (toast.error as jest.Mock).mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: jest.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: jest.fn(),
    });
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
    expect(await screen.findByText(/Portf.lio je zatia/i)).toBeInTheDocument();
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

  it('shows owner empty state with a working desktop create action', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByText(/Portf.lio je zatia/i)).toBeInTheDocument();
    expect(screen.getByText(/Pridaj prv/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Vytvori.*portf/i }));
    expect(screen.getByTestId('portfolio-create-desktop-modal')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-create-form')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 4')).toBeInTheDocument();
  });

  it('renders the desktop category list outside the scrollable modal body', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));
    fillDesktopTitle('New Work');

    const categoryButton = screen.getByLabelText(/Kateg.ria/i);
    categoryButton.getBoundingClientRect = jest.fn(() => ({
      x: 52,
      y: 244,
      top: 244,
      right: 812,
      bottom: 292,
      left: 52,
      width: 760,
      height: 48,
      toJSON: () => ({}),
    }));

    fireEvent.click(categoryButton);

    const listbox = screen.getByRole('listbox', { name: /Kateg.ria/i });
    expect(document.body).toContainElement(listbox);
    expect(screen.getByTestId('portfolio-create-form')).not.toContainElement(listbox);
    expect(listbox).toHaveStyle({
      position: 'fixed',
      left: '52px',
      width: '760px',
    });
    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(10);
  });

  it('keeps the existing inline create form on mobile', async () => {
    mockViewport(true);
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));

    expect(screen.queryByTestId('portfolio-create-desktop-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('portfolio-create-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/N.zov/i)).toBeInTheDocument();
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
    expect(await screen.findByText(/Portf.lio zatia.*dostup/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vytvori.*portf/i })).not.toBeInTheDocument();
  });

  it('validates required fields before creating portfolio', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));
    fireEvent.submit(screen.getByTestId('portfolio-create-form'));

    expect(await screen.findByText(/N.zov je povinn/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kateg.ria je povinn/i)).not.toBeInTheDocument();
    const titleInput = screen.getByLabelText(/N.zov/i);
    const titleErrorId = titleInput.getAttribute('aria-describedby');
    expect(titleErrorId).toBeTruthy();
    expect(document.getElementById(titleErrorId as string)).toHaveTextContent(/N.zov je povinn/i);
    expect(api.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/N.zov je povinn/i));

    fireEvent.change(titleInput, { target: { value: 'New Work' } });
    clickNextStep();
    fireEvent.submit(screen.getByTestId('portfolio-create-form'));

    expect(await screen.findByText(/Kateg.ria je povinn/i)).toBeInTheDocument();
    const categoryInput = screen.getByLabelText(/Kateg.ria/i);
    const categoryErrorId = categoryInput.getAttribute('aria-describedby');
    expect(categoryErrorId).toBeTruthy();
    expect(document.getElementById(categoryErrorId as string)).toHaveTextContent(/Kateg.ria je povinn/i);
    expect(api.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Kateg.ria je povinn/i));
  });

  it('prevents duplicate create submissions while the request is pending', async () => {
    const pendingCreate = deferred<{ data: PortfolioItem }>();
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    (api.post as jest.Mock).mockReturnValue(pendingCreate.promise);

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));
    advanceToDesktopPhotosStep('New Work');
    const form = screen.getByTestId('portfolio-create-form');
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(api.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingCreate.resolve({
        data: portfolioItem({
          id: 9,
          title: 'New Work',
          category: 'it-a-technologie',
          sort_order: 2,
        }),
      });
    });
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

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));
    advanceToDesktopPhotosStep(' New Work ', ' New description ');
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

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));
    advanceToDesktopPhotosStep('New Work');
    fireEvent.submit(screen.getByTestId('portfolio-create-form'));

    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Forbidden');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows local photo previews before creating portfolio', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori.*portf/i }));
    advanceToDesktopPhotosStep('New Work');
    const input = screen.getByTestId('portfolio-create-photo-input');
    const file = new File(['image-bytes'], 'work.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('img', { name: /N.h.ad fotky 1/ })).toHaveAttribute(
      'src',
      'blob:work.jpg',
    );
  });

  it('rejects unsupported create photos before portfolio submission', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vytvori/ }));
    advanceToDesktopPhotosStep('New Work');
    const input = screen.getByTestId('portfolio-create-photo-input');
    const file = new File(['<svg></svg>'], 'work.svg', { type: 'image/svg+xml' });

    expect(input).toHaveAttribute('accept', '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif');

    fireEvent.change(input, { target: { files: [file] } });

    expect(
      screen.getByText((content, element) => (
        element?.tagName.toLowerCase() === 'p' && content.startsWith('Vyber')
      )),
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Vyber/));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows an error state with retry', async () => {
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ data: [portfolioItem()] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByText(/Portf.lio sa nepodarilo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sk.si.*znova/i }));

    expect(await screen.findByTestId('portfolio-featured-card')).toHaveTextContent('Featured Work');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('renders the first item as featured and the next two items beside it', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        portfolioItem({ id: 1, title: 'First Work' }),
        portfolioItem({ id: 2, title: 'Second Work', cover_image: null }),
        portfolioItem({ id: 3, title: 'Third Work', cover_image: null }),
      ],
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByTestId('portfolio-featured-card')).toHaveTextContent('First Work');
    expect(screen.getByTestId('portfolio-highlight-side-grid')).toBeInTheDocument();
    expect(screen.getAllByTestId('portfolio-grid-card')).toHaveLength(2);
    expect(screen.queryByText(/al.ie portf/i)).not.toBeInTheDocument();
  });

  it('shows a heading above portfolio items after the first three', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        portfolioItem({ id: 1, title: 'First Work' }),
        portfolioItem({ id: 2, title: 'Second Work', cover_image: null }),
        portfolioItem({ id: 3, title: 'Third Work', cover_image: null }),
        portfolioItem({ id: 4, title: 'Fourth Work', cover_image: null }),
      ],
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    expect(await screen.findByText(/al.ie portf/i)).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-grid')).toHaveTextContent('Fourth Work');
  });

  it('reorders portfolio items inline while dragging and keeps the first item featured', async () => {
    const first = portfolioItem({ id: 1, title: 'First Work', sort_order: 0 });
    const second = portfolioItem({ id: 2, title: 'Second Work', sort_order: 1, cover_image: null });
    (api.get as jest.Mock).mockResolvedValue({ data: [first, second] });
    (api.patch as jest.Mock).mockResolvedValue({
      data: [
        { ...second, sort_order: 0, is_featured: true },
        { ...first, sort_order: 1, is_featured: false },
      ],
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    const featuredSection = await screen.findByRole('region', { name: /Vybran/i });
    expect(within(featuredSection).getByRole('button', { name: /Vytvori.*portf/i })).toBeInTheDocument();
    fireEvent.click(within(featuredSection).getByRole('button', { name: /Usporiada/i }));
    expect(screen.queryByTestId('portfolio-order-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hotovo' })).toBeInTheDocument();

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: jest.fn(),
      getData: jest.fn(),
    };
    fireEvent.dragStart(screen.getByTestId('portfolio-reorder-card-2'), { dataTransfer });
    fireEvent.dragOver(screen.getByTestId('portfolio-reorder-card-1'), { dataTransfer });

    expect(screen.getByTestId('portfolio-featured-card')).toHaveTextContent('Second Work');
    fireEvent.dragEnd(screen.getByTestId('portfolio-reorder-card-2'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/portfolio/reorder/', {
        item_ids: [2, 1],
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId('portfolio-featured-card')).toHaveTextContent('Second Work');
    });
  });

  it('keeps the button-based order panel on mobile', async () => {
    mockViewport(true);
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        portfolioItem({ id: 1, title: 'First Work', sort_order: 0 }),
        portfolioItem({ id: 2, title: 'Second Work', sort_order: 1, cover_image: null }),
      ],
    });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile={false} ownerUserId={1} />);

    fireEvent.click(await screen.findByRole('button', { name: /Poradie portf/i }));

    expect(await screen.findByTestId('portfolio-order-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-reorder-card-1')).not.toBeInTheDocument();
  });

  it('does not show portfolio ordering controls to visitors', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [portfolioItem()] });

    render(<ProfilePortfolioSection activeTab="portfolio" isOtherUserProfile ownerUserId={42} />);

    expect(await screen.findByTestId('portfolio-featured-card')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Poradie portf/i })).not.toBeInTheDocument();
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
