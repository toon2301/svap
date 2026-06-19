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

describe('PortfolioDetailModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.queryByRole('button', { name: 'Upraviť' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vymazať' })).not.toBeInTheDocument();
  });

  it('shows owner edit and delete actions in detail', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByRole('button', { name: 'Upraviť' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vymazať' })).toBeInTheDocument();
  });

  it('shows upload UI only to the portfolio owner', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: portfolioItem() });

    const { unmount } = render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Portfolio Detail')).toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-upload-section')).not.toBeInTheDocument();

    unmount();
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByTestId('portfolio-upload-section')).toBeInTheDocument();
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
    expect(screen.getByText('Môžeš pridať maximálne 8 fotiek')).toBeInTheDocument();
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

  it('shows owner image statuses including rejected reasons', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: manageablePortfolioItem({
        cover_image: null,
        images: [
          portfolioImage(1, 'pending'),
          { ...portfolioImage(2, 'rejected'), rejected_reason: 'Unsafe content' },
          portfolioImage(3, 'approved'),
        ],
      }),
    });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    expect(await screen.findByText('Fotka čaká na kontrolu')).toBeInTheDocument();
    expect(screen.getByText('Fotka bola zamietnutá')).toBeInTheDocument();
    expect(screen.getByText('Unsafe content')).toBeInTheDocument();
    expect(screen.getByText('Fotka je schválená')).toBeInTheDocument();
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

      expect(await screen.findByText('Fotka čaká na kontrolu')).toBeInTheDocument();
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

      fireEvent.click(await screen.findByRole('button', { name: 'Upraviť' }));
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

    fireEvent.click(await screen.findByRole('button', { name: 'Upraviť' }));
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

    fireEvent.click(await screen.findByRole('button', { name: 'Upraviť' }));
    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: ' Updated Portfolio ' } });
    fireEvent.change(screen.getByLabelText('Kategória'), { target: { value: 'it-a-technologie' } });
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

    fireEvent.click(await screen.findByRole('button', { name: 'Upraviť' }));
    fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'Updated Portfolio' } });
    fireEvent.submit(screen.getByTestId('portfolio-inline-edit-panel'));

    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  it('opens delete confirmation and deletes the portfolio item', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });
    (api.delete as jest.Mock).mockResolvedValue({});

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vymazať' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vymazať' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/auth/portfolio/7/');
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/jane-doe/portfolio');
  });

  it('focuses the delete dialog cancel button and closes the dialog with Escape', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: manageablePortfolioItem() });

    render(<PortfolioDetailModule itemId={7} ownerIdentifier="jane-doe" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vymazať' }));
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
