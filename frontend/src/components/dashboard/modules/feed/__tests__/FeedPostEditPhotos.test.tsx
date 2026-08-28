/**
 * Úprava fotiek príspevku – draft stav a jedno spoločné „Uložiť".
 *
 * Overuje sa: označenie na odobratie je LEN lokálne (Zrušiť ho zahodí),
 * pridanie fotky do draftu sa neodošle skôr než pri Uložiť, celá sekvencia
 * (text → mazanie → upload) v jednom kliku, blokovanie odobratia poslednej
 * fotky pri prázdnom texte a čiastočné zlyhanie, ktoré modal nezavrie.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostEditModal from '../FeedPostEditModal';
import {
  deleteFeedPostImage,
  getFeedPost,
  updateFeedPost,
  type FeedPost,
} from '@/lib/feedApi';
import { uploadFeedPostImages } from '@/lib/feedImageUpload';

jest.mock('@/lib/feedApi', () => ({
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  getFeedPost: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: (name: string) =>
    /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(name),
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

const toastError = jest.fn();
const toastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;
const mockedDeleteImage = deleteFeedPostImage as jest.MockedFunction<
  typeof deleteFeedPostImage
>;
const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedUpload = uploadFeedPostImages as jest.MockedFunction<
  typeof uploadFeedPostImages
>;

function image(id: number): FeedPost['images'][number] {
  return {
    id,
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
  };
}

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Povodny text',
    author: {
      id: 1,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [image(11), image(12)],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

function renderModal(post = makePost(), onUpdated = jest.fn()) {
  const onClose = jest.fn();
  render(
    <FeedPostEditModal open post={post} onClose={onClose} onUpdated={onUpdated} />,
  );
  return { onClose, onUpdated };
}

function pickFile(name = 'nova.jpg') {
  const input = screen.getByTestId(
    'feed-post-edit-file-input',
  ) as HTMLInputElement;
  const file = new File(['x'], name, { type: 'image/jpeg' });
  return { input, file };
}

beforeEach(() => {
  mockedUpdate.mockReset();
  mockedDeleteImage.mockReset();
  mockedGetPost.mockReset();
  mockedUpload.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  mockedDeleteImage.mockResolvedValue(undefined);
  mockedUpload.mockResolvedValue([]);
  mockedGetPost.mockResolvedValue(makePost({ images: [image(12)] }));
});

describe('draft odobratia', () => {
  it('marks a photo instead of hiding it right away', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));

    // Fotka ostáva viditeľná, len jasne označená – používateľ vidí, čo sa
    // zmení po uložení.
    const marked = screen.getByTestId('feed-post-edit-photo-11');
    expect(marked).toHaveAttribute('data-removed', 'true');
    expect(within(marked).getByText('Odoberie sa')).toBeInTheDocument();
    // Nič sa zatiaľ neodoslalo.
    expect(mockedDeleteImage).not.toHaveBeenCalled();
  });

  it('takes the mark back on a second click', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));

    expect(screen.getByTestId('feed-post-edit-photo-11')).toHaveAttribute(
      'data-removed',
      'false',
    );
  });

  it('sends nothing when the draft is cancelled', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));

    // Na serveri sa nezmenilo nič – ani fotka, ani text.
    expect(mockedDeleteImage).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedUpload).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('removes the marked photo on save', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(mockedDeleteImage).toHaveBeenCalledWith(7, 11));
    // Neoznačená fotka sa nemaže.
    expect(mockedDeleteImage).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalled();
  });
});

describe('draft pridania', () => {
  it('shows a picked file in the draft without uploading it', async () => {
    renderModal();
    const { input, file } = pickFile();

    await userEvent.upload(input, file);

    expect(screen.getByText('nova.jpg')).toBeInTheDocument();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('sends no upload when the draft is cancelled', async () => {
    renderModal();
    const { input, file } = pickFile();

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));

    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('drops a picked file from the draft before saving', async () => {
    renderModal();
    const { input, file } = pickFile();

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-new-photo-remove'));

    expect(screen.queryByText('nova.jpg')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
    await waitFor(() => expect(mockedUpload).not.toHaveBeenCalled());
  });

  it('runs the whole upload flow on save', async () => {
    renderModal();
    const { input, file } = pickFile();

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
    const [postId, files, , options] = mockedUpload.mock.calls[0];
    expect(postId).toBe(7);
    expect(files.map((item) => item.name)).toEqual(['nova.jpg']);
    // Backend podľa toho označí príspevok ako upravený.
    expect(options).toEqual({ isEdit: true });
  });

  it('hides the add button once the draft is full', async () => {
    renderModal(makePost({ images: [11, 12, 13, 14].map(image) }));
    const { input, file } = pickFile();

    await userEvent.upload(input, file);

    expect(
      screen.queryByTestId('feed-post-edit-add-photo'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-post-edit-photos-full')).toBeInTheDocument();
  });
});

describe('celá sekvencia', () => {
  it('applies text, removal and upload in one save', async () => {
    const { onUpdated, onClose } = renderModal();
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text' }));
    const { input, file } = pickFile();

    const textarea = screen.getByTestId('feed-post-edit-input');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockedUpdate).toHaveBeenCalledWith(7, 'Novy text');
    expect(mockedDeleteImage).toHaveBeenCalledWith(7, 11);
    expect(mockedUpload).toHaveBeenCalled();
    // Karta dostane stav načítaný zo servera, nie poskladaný z odpovedí.
    expect(mockedGetPost).toHaveBeenCalledWith(7);
    expect(onUpdated).toHaveBeenCalled();
  });

  it('deletes before uploading so the limit frees up first', async () => {
    const order: string[] = [];
    mockedDeleteImage.mockImplementation(async () => {
      order.push('delete');
    });
    mockedUpload.mockImplementation(async () => {
      order.push('upload');
      return [];
    });
    renderModal();
    const { input, file } = pickFile();

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(order).toEqual(['delete', 'upload']));
  });

  it('uploads before deleting when the only photo is swapped', async () => {
    const order: string[] = [];
    mockedDeleteImage.mockImplementation(async () => {
      order.push('delete');
    });
    mockedUpload.mockImplementation(async () => {
      order.push('upload');
      return [];
    });
    // Príspevok bez textu s jedinou fotkou – tú chce používateľ vymeniť.
    const single = makePost({ caption: '', images: [image(11)] });
    mockedGetPost.mockResolvedValue(makePost({ caption: '', images: [image(99)] }));
    const { onClose } = renderModal(single);
    const { input, file } = pickFile();

    // Najprv pribudne náhrada, potom sa dá označiť pôvodná.
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    // Bez tohto poradia by backend odobratie poslednej fotky odmietol a
    // príspevok by skončil s oboma fotkami.
    await waitFor(() => expect(order).toEqual(['upload', 'delete']));
    expect(mockedDeleteImage).toHaveBeenCalledWith(7, 11);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('keeps the old photo when its replacement fails to upload', async () => {
    mockedUpload.mockResolvedValue([
      { file: new File(['x'], 'nova.jpg'), error: new Error('offline') },
    ]);
    const single = makePost({ caption: '', images: [image(11)] });
    renderModal(single);
    const { input, file } = pickFile();

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    // Náhrada nedorazila, takže stará fotka je jediný obsah – zmazať ju by
    // znamenalo vyrobiť prázdny príspevok.
    expect(mockedDeleteImage).not.toHaveBeenCalled();
  });

  /**
   * Poradie krokov kopíruje to, čo UI vôbec dovolí: kým je príspevok plný,
   * nedá sa nič pridať, a kým je text prázdny, nedá sa označiť posledná
   * zostávajúca fotka. Plná výmena teda vzniká ako „označ, čo sa dá → pridaj
   * náhradu → označ aj zvyšok".
   */
  async function markPhotos(ids: number[]) {
    for (const id of ids) {
      await userEvent.click(
        screen.getByTestId(`feed-post-edit-photo-remove-${id}`),
      );
    }
  }

  async function addPhotos(names: string[]) {
    const input = screen.getByTestId(
      'feed-post-edit-file-input',
    ) as HTMLInputElement;
    await userEvent.upload(
      input,
      names.map((name) => new File(['x'], name, { type: 'image/jpeg' })),
    );
  }

  /** Mocky, ktoré sa správajú ako backend: strážia limit aj prázdny príspevok. */
  function trackPhotoServer(ids: number[]) {
    const active = new Set(ids);
    const steps: string[] = [];
    let nextId = 100;
    mockedDeleteImage.mockImplementation(async (_postId, imageId) => {
      if (active.size <= 1) throw new Error('cannot_remove_last_content');
      active.delete(imageId);
      steps.push(`delete:${imageId}`);
    });
    mockedUpload.mockImplementation(async (_postId, files) => {
      for (const file of files) {
        if (active.size >= 5) throw new Error('feed_post_images_limit_reached');
        active.add((nextId += 1));
        steps.push(`upload:${file.name}`);
      }
      return [];
    });
    return { active, steps };
  }

  it('swaps a full set of photos without ever emptying the post', async () => {
    const ids = [11, 12, 13, 14, 15];
    const { active, steps } = trackPhotoServer(ids);
    mockedGetPost.mockResolvedValue(
      makePost({ caption: '', images: [image(101), image(102)] }),
    );
    const { onClose } = renderModal(
      makePost({ caption: '', images: ids.map(image) }),
    );

    await markPhotos([11, 12, 13, 14]);
    await addPhotos(['nova1.jpg', 'nova2.jpg']);
    await markPhotos([15]);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // Uvoľni miesto (štyri preč), jednu podrž ako obsah, nahraj nové, a až
    // potom pusti aj tú podržanú.
    expect(steps).toEqual([
      'delete:11',
      'delete:12',
      'delete:13',
      'delete:14',
      'upload:nova1.jpg',
      'upload:nova2.jpg',
      'delete:15',
    ]);
    // Ostali len tie dve nové. Mocky by vyhodili chybu, keby príspevok
    // v ktoromkoľvek kroku ostal prázdny alebo prekročil limit.
    expect(active.size).toBe(2);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('adds the photos that did not fit only after the held one is gone', async () => {
    // Krajný prípad päť za päť: piata nová sa vojde až po odchode podržanej.
    const ids = [11, 12, 13, 14, 15];
    const { active, steps } = trackPhotoServer(ids);
    mockedGetPost.mockResolvedValue(makePost({ caption: '', images: [image(101)] }));
    renderModal(makePost({ caption: '', images: ids.map(image) }));

    await markPhotos([11, 12, 13, 14]);
    await addPhotos(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
    await markPhotos([15]);
    await addPhotos(['e.jpg']);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(steps).toContain('upload:e.jpg'));
    expect(steps.indexOf('upload:e.jpg')).toBeGreaterThan(
      steps.indexOf('delete:15'),
    );
    expect(active.size).toBe(5);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps the held photo when the replacements fail to upload', async () => {
    const ids = [11, 12, 13, 14, 15];
    mockedUpload.mockResolvedValue([
      { file: new File(['x'], 'nova.jpg'), error: new Error('offline') },
    ]);
    renderModal(makePost({ caption: '', images: ids.map(image) }));

    await markPhotos([11, 12, 13, 14]);
    await addPhotos(['nova.jpg']);
    await markPhotos([15]);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    // Uvoľnenie miesta prebehlo, ale podržaná fotka ostáva – bez nej by
    // príspevok nemal žiadny obsah.
    const deleted = mockedDeleteImage.mock.calls.map(([, imageId]) => imageId);
    expect(deleted).toEqual([11, 12, 13, 14]);
  });

  it('stops before touching photos when the text fails', async () => {
    mockedUpdate.mockRejectedValue(new Error('offline'));
    const { onClose } = renderModal();

    const textarea = screen.getByTestId('feed-post-edit-input');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    // Fotka sa nesmie odobrať pod textom, ktorý sa nezmenil.
    expect(mockedDeleteImage).not.toHaveBeenCalled();
    expect(mockedUpload).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the dialog open when an upload fails', async () => {
    mockedUpload.mockResolvedValue([
      { file: new File(['x'], 'nova.jpg'), error: new Error('offline') },
    ]);
    const { onClose } = renderModal();
    const { input, file } = pickFile();

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining('nova.jpg'),
      ),
    );
    // Používateľ musí vidieť, čo neprešlo – dialóg sa sám nezavrie.
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps the dialog open when a removal fails', async () => {
    mockedDeleteImage.mockRejectedValue(new Error('offline'));
    const { onClose } = renderModal();

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('príspevok nesmie ostať prázdny', () => {
  it('hides the remove button on the last photo when there is no text', async () => {
    renderModal(makePost({ caption: '', images: [image(11)] }));

    // Bez textu je táto fotka jediný obsah. „X" sa nekreslí vôbec – vypnuté
    // tlačidlo by ponúkalo akciu, ktorá sa nikdy nevykoná.
    expect(
      screen.queryByTestId('feed-post-edit-photo-remove-11'),
    ).not.toBeInTheDocument();
    // Fotka samotná je stále vidieť.
    expect(screen.getByTestId('feed-post-edit-photo-11')).toBeInTheDocument();
  });

  it('brings the remove button back as soon as text is typed', async () => {
    renderModal(makePost({ caption: '', images: [image(11)] }));

    await userEvent.type(screen.getByTestId('feed-post-edit-input'), 'Nieco');

    expect(
      await screen.findByTestId('feed-post-edit-photo-remove-11'),
    ).toBeEnabled();
  });

  it('hides it on the last photo left in the draft', async () => {
    renderModal(makePost({ caption: '' }));

    await userEvent.click(screen.getByTestId('feed-post-edit-photo-remove-11'));

    // Prvá je označená, takže druhá je jediný zostávajúci obsah.
    expect(
      screen.queryByTestId('feed-post-edit-photo-remove-12'),
    ).not.toBeInTheDocument();
    // Označenie prvej sa dá vrátiť späť aj tak – tam „X" ostáva.
    expect(screen.getByTestId('feed-post-edit-photo-remove-11')).toBeEnabled();
  });

  it('keeps the remove button on the last photo when the post has text', async () => {
    renderModal(makePost({ images: [image(11)] }));

    expect(screen.getByTestId('feed-post-edit-photo-remove-11')).toBeEnabled();
  });

  it('refuses to save when nothing would be left', async () => {
    renderModal(makePost({ images: [] }));

    await userEvent.clear(screen.getByTestId('feed-post-edit-input'));

    // Bez textu aj bez fotky by z príspevku neostalo nič.
    expect(screen.getByTestId('feed-post-edit-submit')).toBeDisabled();
  });

  it('allows saving without text when a photo stays', async () => {
    renderModal(makePost({ images: [image(11)] }));

    await userEvent.clear(screen.getByTestId('feed-post-edit-input'));

    // Fotka je obsah – prázdny text je vtedy v poriadku.
    expect(screen.getByTestId('feed-post-edit-submit')).toBeEnabled();
  });
});
