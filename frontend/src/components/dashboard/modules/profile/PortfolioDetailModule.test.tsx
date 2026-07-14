import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PortfolioDetailModule from './PortfolioDetailModule';
import axios from 'axios';
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
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    portfolio: {
      detail: (id: number) => `/auth/portfolio/${id}/`,
      imageUploadInit: (id: number) => `/auth/portfolio/${id}/images/upload-init/`,
      imageUploadComplete: (id: number) => `/auth/portfolio/${id}/images/upload-complete/`,
      imageDetail: (itemId: number, imageId: number) => `/auth/portfolio/${itemId}/images/${imageId}/`,
      imageCover: (itemId: number, imageId: number) => `/auth/portfolio/${itemId}/images/${imageId}/cover/`,
    },
  },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

function portfolioItem(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id: 7,
    title: 'Portfolio Detail',
    category: 'it-a-technologie',
    description: 'Detail description',
    sort_order: 1,
    can_manage: false,
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

function manageablePortfolioItem(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return portfolioItem({ can_manage: true, ...overrides });
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

function imageFile(name = 'work.jpg', type = 'image/jpeg', size = 16): File {
  return new File([new Uint8Array(size)], name, { type });
}

function portfolioImage(id: number, status: 'pending' | 'approved' | 'rejected' = 'approved') {
  return {
    id,
    thumbnail_url: `/media/thumb-${id}.webp`,
    medium_url: `/media/medium-${id}.webp`,
    large_url: `/media/large-${id}.webp`,
    image_url: `/media/original-${id}.webp`,
    order: id,
    status,
  };
}

function mockSuccessfulUpload(imageId = 55) {
  (api.post as jest.Mock).mockImplementation((url: string, payload: unknown) => {
    if (url === '/auth/portfolio/7/images/upload-init/') {
      return Promise.resolve({
        data: {
          url: 'https://storage.example/upload',
          fields: { key: 'uploads/portfolio/7/work.jpg', policy: 'policy' },
          key: 'uploads/portfolio/7/work.jpg',
        },
      });
    }
    if (url === '/auth/portfolio/7/images/upload-complete/') {
      return Promise.resolve({ data: { id: imageId, status: 'pending', order: 2 } });
    }
    return Promise.reject(new Error(`Unexpected POST ${url} ${JSON.stringify(payload)}`));
  });
}

function selectFirstPortfolioCategory() {
  fireEvent.click(screen.getByLabelText('Kategória'));
  const listbox = screen.getByRole('listbox', { name: 'Kategória' });
  fireEvent.click(within(listbox).getAllByRole('option')[0]);
}

async function clickPortfolioDetailEdit() {
  const [editButton] = await screen.findAllByRole('button', { name: /Upravi/ });
  fireEvent.click(editButton);
}

function galleryImageOrder(): string[] {
  return Array.from(
    screen
      .getByTestId('portfolio-detail-gallery')
      .querySelectorAll<HTMLElement>('[data-testid^="portfolio-gallery-image-"]'),
  ).map((element) => element.getAttribute('data-testid') || '');
}

function mockMobileViewport(isMobile: boolean) {
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

describe('PortfolioDetailModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileViewport(false);
    mockPush.mockClear();
    (api.post as jest.Mock).mockReset();
    (api.patch as jest.Mock).mockReset();
    (api.delete as jest.Mock).mockReset();
    (axios.post as jest.Mock).mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: jest.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: jest.fn(),
    });
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

  it('keeps the latest detail response when requests resolve out of order', async () => {
    const slowFirstRequest = deferred<{ data: PortfolioItem }>();
    const fastSecondRequest = deferred<{ data: PortfolioItem }>();
    (api.get as jest.Mock)
      .mockReturnValueOnce(slowFirstRequest.promise)
      .mockReturnValueOnce(fastSecondRequest.promise);

    const { rerender } = render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);
    rerender(<PortfolioDetailModule itemId={8} ownerIdentifier="jane-doe" />);

    await act(async () => {
      fastSecondRequest.resolve({ data: portfolioItem({ id: 8, title: 'Newest Portfolio' }) });
    });
    expect(await screen.findByText('Newest Portfolio')).toBeInTheDocument();

    await act(async () => {
      slowFirstRequest.resolve({ data: portfolioItem({ id: 7, title: 'Stale Portfolio' }) });
    });

    expect(screen.getByText('Newest Portfolio')).toBeInTheDocument();
    expect(screen.queryByText('Stale Portfolio')).not.toBeInTheDocument();
  });

  it('always navigates back to the owner portfolio list', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: /Späť/ }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/jane-doe/portfolio');
  });

  it('does not show owner actions to visitors', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upravi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Viac/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Vyma/ })).not.toBeInTheDocument();
  });

  it('shows owner edit and delete actions in detail', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect((await screen.findAllByRole('button', { name: /Upravi/ })).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Viac/ }));
    expect(screen.getByRole('menuitem', { name: /Vyma/ })).toBeInTheDocument();
  });

  it('shows a static like count between mobile owner actions', async () => {
    mockMobileViewport(true);
    (api.get as jest.Mock).mockResolvedValue({
      data: manageablePortfolioItem({ likes_count: 12, is_liked_by_me: true }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    const likeCount = screen.getByTestId('portfolio-mobile-like-count');

    expect(likeCount).toHaveTextContent('12');
    expect(likeCount.closest('button')).toBeNull();
  });

  it('opens mobile edit choices instead of the inline edit panel', async () => {
    mockMobileViewport(true);
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await clickPortfolioDetailEdit();

    expect(screen.getByTestId('portfolio-mobile-edit-flow')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-mobile-edit-option-title')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-mobile-edit-option-category')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-mobile-edit-option-description')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-mobile-edit-option-photos')).toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-inline-edit-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portfolio-mobile-edit-left-action'));

    expect(screen.queryByTestId('portfolio-mobile-edit-flow')).not.toBeInTheDocument();
    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
  });

  it('saves a mobile title edit and returns to edit choices', async () => {
    mockMobileViewport(true);
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.patch as jest.Mock).mockResolvedValue({
      data: manageablePortfolioItem({ title: 'Updated Mobile Portfolio' }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await clickPortfolioDetailEdit();
    fireEvent.click(screen.getByTestId('portfolio-mobile-edit-option-title'));
    fireEvent.change(screen.getByTestId('portfolio-mobile-edit-title-input'), {
      target: { value: ' Updated Mobile Portfolio ' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('portfolio-mobile-edit-left-action'));
    });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/portfolio/7/', {
        title: 'Updated Mobile Portfolio',
        category: 'it-a-technologie',
        description: 'Detail description',
      });
    });
    expect(await screen.findByTestId('portfolio-mobile-edit-flow')).toBeInTheDocument();
    expect(screen.getByText('Updated Mobile Portfolio')).toBeInTheDocument();
  });

  it('opens mobile photo editing with cover and delete actions', async () => {
    mockMobileViewport(true);
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await clickPortfolioDetailEdit();
    fireEvent.click(screen.getByTestId('portfolio-mobile-edit-option-photos'));

    expect(screen.getByTestId('portfolio-mobile-photo-editor')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-mobile-edit-photo-upload')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-gallery-cover-button-1')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-gallery-delete-button-1')).toBeInTheDocument();
  });
  it('shows upload UI only to the portfolio owner', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    const { unmount } = render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-upload-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-gallery-upload-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-gallery-edit-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-image-management-section')).not.toBeInTheDocument();

    unmount();
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByTestId('portfolio-gallery-upload-controls')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-gallery-edit-button')).toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-upload-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-image-management-section')).not.toBeInTheDocument();
  });

  it('toggles desktop gallery image management controls for the owner', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const editButton = await screen.findByTestId('portfolio-gallery-edit-button');
    expect(editButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('portfolio-gallery-delete-button-1')).not.toBeInTheDocument();

    fireEvent.click(editButton);

    expect(editButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('portfolio-gallery-cover-button-1')).toBeDisabled();
    expect(screen.getByTestId('portfolio-gallery-cover-button-2')).toBeEnabled();
    expect(screen.getByTestId('portfolio-gallery-delete-button-1')).toBeInTheDocument();

    fireEvent.click(editButton);

    expect(editButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('portfolio-gallery-delete-button-1')).not.toBeInTheDocument();
  });

  it('sets a cover photo from the desktop gallery edit controls without moving it', async () => {
    const first = portfolioImage(1, 'approved');
    const second = portfolioImage(2, 'approved');
    (api.get as jest.Mock)
      .mockResolvedValueOnce({
        data: manageablePortfolioItem({ cover_image: first, images: [first, second] }),
      })
      .mockResolvedValueOnce({
        data: manageablePortfolioItem({ cover_image: second, images: [first, second] }),
      });
    (api.patch as jest.Mock).mockResolvedValue({
      data: { cover_image: second },
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByTestId('portfolio-gallery-edit-button'));
    expect(galleryImageOrder()).toEqual([
      'portfolio-gallery-image-1',
      'portfolio-gallery-image-2',
    ]);

    await act(async () => {
      fireEvent.click(screen.getByTestId('portfolio-gallery-cover-button-2'));
    });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/portfolio/7/images/2/cover/', {});
    });
    await waitFor(() => {
      expect(screen.getByTestId('portfolio-gallery-cover-button-2')).toBeDisabled();
    });
    expect(galleryImageOrder()).toEqual([
      'portfolio-gallery-image-1',
      'portfolio-gallery-image-2',
    ]);
    expect(screen.queryByRole('dialog', { name: /Gal/ })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('deletes a photo from the desktop gallery edit controls without confirmation', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.delete as jest.Mock).mockResolvedValue({});

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByTestId('portfolio-gallery-edit-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('portfolio-gallery-delete-button-2'));
    });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/auth/portfolio/7/images/2/');
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('disables new photo selection when the portfolio already has 8 active images', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: manageablePortfolioItem({
        cover_image: null,
        images: Array.from({ length: 8 }, (_, index) => portfolioImage(index + 1, 'approved')),
      }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByTestId('portfolio-upload-button')).toBeDisabled();
    expect(screen.queryByText('Môžeš pridať maximálne 8 fotiek')).not.toBeInTheDocument();
  });

  it('shows validation errors for too large and invalid image files', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem({ cover_image: null, images: [] }) });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const input = await screen.findByTestId('portfolio-upload-input');
    expect(input).toHaveAttribute('accept', '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif');
    fireEvent.change(input, {
      target: { files: [imageFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)] },
    });

    expect(await screen.findByText('Fotka je príliš veľká')).toBeInTheDocument();

    fireEvent.change(input, {
      target: { files: [imageFile('vector.svg', 'image/svg+xml')] },
    });

    expect(await screen.findByText('Vyber súbor obrázka')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uploads a selected image with progress and completes the upload', async () => {
    const storageUpload = deferred<{ status: number }>();
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem({ cover_image: null, images: [] }) });
    mockSuccessfulUpload(55);
    (axios.post as jest.Mock).mockImplementation((_url, _formData, config) => {
      config.onUploadProgress?.({ loaded: 50, total: 100 });
      return storageUpload.promise;
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const input = await screen.findByTestId('portfolio-upload-input');
    fireEvent.change(input, { target: { files: [imageFile()] } });

    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/portfolio/7/images/upload-init/', {
      filename: 'work.jpg',
      content_type: 'image/jpeg',
      size_bytes: 16,
    });

    await act(async () => {
      storageUpload.resolve({ status: 204 });
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/portfolio/7/images/upload-complete/', {
        key: 'uploads/portfolio/7/work.jpg',
        filename: 'work.jpg',
      });
    });
    expect(await screen.findByText('Fotka čaká na kontrolu')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('keeps uploading other files when one image fails', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem({ cover_image: null, images: [] }) });
    (api.post as jest.Mock)
      .mockRejectedValueOnce(new Error('init failed'))
      .mockResolvedValueOnce({
        data: {
          url: 'https://storage.example/upload',
          fields: { key: 'uploads/portfolio/7/second.jpg' },
          key: 'uploads/portfolio/7/second.jpg',
        },
      })
      .mockResolvedValueOnce({ data: { id: 56, status: 'pending', order: 1 } });
    (axios.post as jest.Mock).mockResolvedValue({ status: 204 });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.change(await screen.findByTestId('portfolio-upload-input'), {
      target: { files: [imageFile('first.jpg'), imageFile('second.jpg')] },
    });

    expect(await screen.findByText('Nepodarilo sa nahrať fotku')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/portfolio/7/images/upload-complete/', {
        key: 'uploads/portfolio/7/second.jpg',
        filename: 'second.jpg',
      });
    });
  });

  it('retries a failed image upload', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem({ cover_image: null, images: [] }) });
    mockSuccessfulUpload(57);
    (axios.post as jest.Mock)
      .mockRejectedValueOnce(new Error('storage failed'))
      .mockResolvedValueOnce({ status: 204 });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.change(await screen.findByTestId('portfolio-upload-input'), {
      target: { files: [imageFile()] },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Skúsiť znova' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/portfolio/7/images/upload-complete/', {
        key: 'uploads/portfolio/7/work.jpg',
        filename: 'work.jpg',
      });
    });
  });





  it('does not show owner image statuses or rejected reasons to visitors', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: portfolioItem({
        cover_image: null,
        images: [
          portfolioImage(1, 'pending'),
          { ...portfolioImage(2, 'rejected'), rejected_reason: 'Unsafe content' },
        ],
      }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(screen.queryByText('Fotka čaká na kontrolu')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsafe content')).not.toBeInTheDocument();
  });

  it('does not include pending or rejected images in the gallery and lightbox', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: portfolioItem({
        cover_image: portfolioImage(1, 'approved'),
        images: [
          portfolioImage(1, 'approved'),
          portfolioImage(2, 'pending'),
          { ...portfolioImage(3, 'rejected'), rejected_reason: 'Rejected' },
        ],
      }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByTestId('portfolio-detail-gallery')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Portfolio Detail Fotka/ })).toHaveLength(1);

    const heroImage = screen.getByRole('img', { name: 'Portfolio Detail' });
    fireEvent.click(heroImage.closest('button') as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'Galéria' });
    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-1.webp',
    );
    expect(within(dialog).queryByRole('button', { name: 'Ďalšia fotka' })).not.toBeInTheDocument();
  });

  it('revokes local preview object URLs on unmount', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem({ cover_image: null, images: [] }) });

    const { unmount } = render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.change(await screen.findByTestId('portfolio-upload-input'), {
      target: { files: [imageFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)] },
    });

    expect(await screen.findByText('Fotka je príliš veľká')).toBeInTheDocument();
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:large.jpg');
  });

  it('polls pending photos with a timeout and stops after the timeout', async () => {
    jest.useFakeTimers();
    try {
      (api.get as jest.Mock).mockResolvedValue({
        data: manageablePortfolioItem({
          cover_image: null,
          images: [portfolioImage(1, 'pending')],
        }),
      });

      render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

      expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        jest.advanceTimersByTime(45000);
      });
      const callsAfterTimeout = (api.get as jest.Mock).mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(api.get).toHaveBeenCalledTimes(callsAfterTimeout);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not reset an unsaved edit draft when pending photo polling refreshes the same item', async () => {
    jest.useFakeTimers();
    try {
      (api.get as jest.Mock)
        .mockResolvedValueOnce({
          data: manageablePortfolioItem({
            cover_image: null,
            images: [portfolioImage(1, 'pending')],
          }),
        })
        .mockResolvedValueOnce({
          data: manageablePortfolioItem({
            title: 'Server refreshed title',
            cover_image: null,
            images: [portfolioImage(1, 'pending')],
          }),
        });

      render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

      await clickPortfolioDetailEdit();
      fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'Draft title' } });

      await act(async () => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
      expect(screen.getByDisplayValue('Draft title')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Server refreshed title')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('prefills edit mode and discards changes on cancel', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await clickPortfolioDetailEdit();
    expect(screen.getByDisplayValue('Portfolio Detail')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Detail description')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'Changed title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Changed title')).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('saves edited portfolio fields with PATCH and updates the detail', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.patch as jest.Mock).mockResolvedValue({
      data: manageablePortfolioItem({
        title: 'Updated Portfolio',
        category: 'it-a-technologie',
        description: 'Updated description',
      }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await clickPortfolioDetailEdit();
    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: ' Updated Portfolio ' } });
    selectFirstPortfolioCategory();
    fireEvent.change(screen.getByLabelText(/Popis/), { target: { value: ' Updated description ' } });
    fireEvent.submit(screen.getByTestId('portfolio-inline-edit-panel'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/portfolio/7/', {
        title: 'Updated Portfolio',
        category: 'it-a-technologie',
        description: 'Updated description',
      });
    });
    expect(await screen.findByText('Updated Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Updated description')).toBeInTheDocument();
  });

  it('shows a safe edit error when the backend rejects the update', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.patch as jest.Mock).mockRejectedValue({
      response: { status: 404, data: { detail: 'Not found' } },
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await clickPortfolioDetailEdit();
    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'Updated Portfolio' } });
    fireEvent.submit(screen.getByTestId('portfolio-inline-edit-panel'));

    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  it('opens delete confirmation and deletes the portfolio item', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.delete as jest.Mock).mockResolvedValue({});

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: /Viac/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Vyma/ }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vymazať' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/auth/portfolio/7/');
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/jane-doe/portfolio');
  });

  it('treats delete 404 (already deleted in another tab) as success and navigates back', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.delete as jest.Mock).mockRejectedValue({
      response: { status: 404, data: { error: 'Polozka portfolia nebola najdena' } },
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: /Viac/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Vyma/ }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vymazať' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/users/jane-doe/portfolio');
    });
    // Žiadna "deleteFailed" chyba – položka už neexistuje, cieľ je splnený.
    expect(screen.queryByText(/nepodarilo.*vymaza/i)).not.toBeInTheDocument();
  });

  it('shows the delete error for non-404 failures', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.delete as jest.Mock).mockRejectedValue({ response: { status: 500 } });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: /Viac/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Vyma/ }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vymazať' }));

    expect(await screen.findByText(/nepodarilo.*vymaza/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('focuses the delete dialog cancel button and closes the dialog with Escape', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: /Viac/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Vyma/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Zrušiť' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
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

  it('opens the correct lightbox photo when gallery order differs from cover order', async () => {
    const first = portfolioImage(1, 'approved');
    const second = portfolioImage(2, 'approved');
    (api.get as jest.Mock).mockResolvedValue({
      data: manageablePortfolioItem({ cover_image: second, images: [first, second] }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    const gallery = await screen.findByTestId('portfolio-detail-gallery');
    fireEvent.click(within(gallery).getByRole('button', { name: /Fotka 1 z 2/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Galéria' });
    expect(within(dialog).getByRole('img', { name: 'Portfolio Detail' })).toHaveAttribute(
      'src',
      '/media/large-1.webp',
    );
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

  it('does not render related offer when it has no category label', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: portfolioItem({
        related_offer: {
          id: 12,
          category: '',
          subcategory: '  ',
          is_seeking: false,
        },
      }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    await screen.findByText('Portfolio Detail');
    expect(screen.queryByText('Súvisiaca ponuka')).not.toBeInTheDocument();
  });
});
