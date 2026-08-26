/**
 * Composer voľného príspevku – text, fotka, tagovanie a skrytá dvojkrokovosť
 * uploadu (create → upload → refetch za jedným klikom).
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostComposerModal from '../FeedPostComposerModal';
import { createFeedPost, getFeedPost, type FeedPost } from '@/lib/feedApi';
import { uploadFeedPostImages } from '@/lib/feedImageUpload';

jest.mock('@/lib/feedApi', () => ({
  createFeedPost: jest.fn(),
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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

const mockIsMobile = jest.fn(() => false);
jest.mock('@/hooks', () => ({
  // Prepíš LEN detekciu mobilu – ostatné hooky nech modulu zostanú dostupné.
  ...jest.requireActual('@/hooks'),
  useIsMobile: () => mockIsMobile(),
  useIsMobileState: () => ({ isMobile: mockIsMobile(), isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({
    ariaLabel,
    onSelect,
  }: {
    ariaLabel: string;
    onSelect: (emoji: string) => void;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={() => onSelect('🙂')}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: ({
    onSelectedUsersChange,
  }: {
    onSelectedUsersChange: (users: { id: number }[]) => void;
  }) => (
    <button
      type="button"
      data-testid="pick-user"
      onClick={() => onSelectedUsersChange([{ id: 42 }])}
    >
      pick
    </button>
  ),
}));

const mockedCreate = createFeedPost as jest.MockedFunction<typeof createFeedPost>;
const mockedGet = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedUpload = uploadFeedPostImages as jest.MockedFunction<
  typeof uploadFeedPostImages
>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;
const mockedToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>;

const created: FeedPost = {
  id: 77,
  post_type: 'free_post',
  caption: 'Ahoj',
  author: {
    id: 1,
    display_name: 'Jana',
    slug: 'jana',
    user_type: 'individual',
    avatar_url: null,
  },
  image: null,
  shared_content: null,
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 0,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: true,
  created_at: '2026-01-01',
} as FeedPost;

function imageFile(name = 'foto.jpg', size = 1024) {
  const file = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderComposer(onCreated = jest.fn()) {
  render(
    <FeedPostComposerModal open onClose={jest.fn()} onCreated={onCreated} />,
  );
  return onCreated;
}

describe('FeedPostComposerModal', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedGet.mockReset();
    mockedUpload.mockReset();
    mockedToastError.mockReset();
    mockedToastSuccess.mockReset();
    mockIsMobile.mockReturnValue(false);
    mockedCreate.mockResolvedValue(created);
    mockedUpload.mockResolvedValue([]);
  });

  it('keeps the submit button disabled until there is text', async () => {
    renderComposer();
    const submit = screen.getByTestId('feed-composer-submit');
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox'), 'Ahoj');

    expect(submit).toBeEnabled();
  });

  it('creates a text-only post without touching the upload chain', async () => {
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'Ahoj');
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(mockedCreate).toHaveBeenCalledWith({
      caption: 'Ahoj',
      taggedUserIds: [],
      willAttachPhoto: false,
    });
    expect(mockedUpload).not.toHaveBeenCalled();
    expect(mockedToastSuccess).toHaveBeenCalled();
  });

  it('creates the post first, then uploads the photos, on a single click', async () => {
    const withImages = {
      ...created,
      images: [{ id: 1, status: 'pending' }],
    } as FeedPost;
    mockedGet.mockResolvedValue(withImages);
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'S fotkami');
    await userEvent.upload(screen.getByTestId('feed-composer-file-input'), [
      imageFile('a.jpg'),
      imageFile('b.jpg'),
    ]);
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    // Poradie je podstatné: upload potrebuje id príspevku, ktorý musí
    // existovať skôr – používateľ o tom nevie, klikol raz.
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    const [postId, sentFiles] = mockedUpload.mock.calls[0];
    expect(postId).toBe(77);
    expect(sentFiles.map((file) => file.name)).toEqual(['a.jpg', 'b.jpg']);
    // Po uploade sa príspevok načíta znova, nech karta ukáže stav fotiek.
    expect(onCreated).toHaveBeenCalledWith(withImages);
  });

  it('sends tagged users along with the post', async () => {
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'S označením');
    await userEvent.click(screen.getByTestId('pick-user'));
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(mockedCreate).toHaveBeenCalledWith({
      caption: 'S označením',
      taggedUserIds: [42],
      willAttachPhoto: false,
    });
  });

  it('names the photos that failed and keeps the post', async () => {
    mockedUpload.mockResolvedValue([
      { file: imageFile('zla.jpg'), error: new Error('S3 down') },
    ]);
    mockedGet.mockRejectedValue(new Error('offline'));
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'Text ostáva');
    await userEvent.upload(screen.getByTestId('feed-composer-file-input'), [
      imageFile('dobra.jpg'),
      imageFile('zla.jpg'),
    ]);
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    // Príspevok vznikol, takže sa musí objaviť vo feede – zmizol by len text.
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    // Varovanie MENUJE konkrétnu fotku, nie „niečo zlyhalo".
    expect(mockedToastError).toHaveBeenCalledWith(
      'Príspevok bol uverejnený, ale tieto fotky sa nepodarilo nahrať: zla.jpg',
    );
    // Dva protichodné toasty vedľa seba by mýlili – úspech sa hlási len keď
    // prešlo naozaj všetko.
    expect(mockedToastSuccess).not.toHaveBeenCalled();
  });

  it('rejects an unsupported photo format before any request', async () => {
    renderComposer();

    // applyAccept: false modeluje presne to, čo test overuje – používateľ
    // v dialógu prepne na „všetky súbory" a `accept` obíde.
    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      new File(['x'], 'obrazok.bmp', { type: 'image/bmp' }),
      { applyAccept: false },
    );

    expect(mockedToastError).toHaveBeenCalledWith(
      'Tento formát fotky nie je podporovaný.',
    );
    expect(
      screen.queryByTestId('feed-composer-image-preview'),
    ).not.toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('does not create anything when the post request fails', async () => {
    mockedCreate.mockRejectedValue({
      response: { data: { error: 'Nedá sa.' } },
    });
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'Ahoj');
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith('Nedá sa.'));
    expect(onCreated).not.toHaveBeenCalled();
    expect(mockedUpload).not.toHaveBeenCalled();
    // Dialóg ostáva otvorený, aby sa napísaný text nestratil.
    expect(screen.getByTestId('feed-composer-modal')).toBeInTheDocument();
  });

  it('previews several photos and removes just one of them', async () => {
    renderComposer();

    await userEvent.upload(screen.getByTestId('feed-composer-file-input'), [
      imageFile('more.jpg'),
      imageFile('hory.jpg'),
    ]);

    const previews = await screen.findAllByTestId('feed-composer-image-preview');
    expect(previews).toHaveLength(2);
    expect(within(previews[0]).getByText('more.jpg')).toBeInTheDocument();

    await userEvent.click(
      within(previews[0]).getByRole('button', { name: /more\.jpg/ }),
    );

    const left = screen.getAllByTestId('feed-composer-image-preview');
    expect(left).toHaveLength(1);
    expect(within(left[0]).getByText('hory.jpg')).toBeInTheDocument();
  });

  it('enforces the image limit while picking', async () => {
    renderComposer();

    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      Array.from({ length: 7 }, (_, index) => imageFile(`f${index}.jpg`)),
    );

    // Nadbytočné sa zahodia a povie sa to.
    expect(screen.getAllByTestId('feed-composer-image-preview')).toHaveLength(5);
    expect(mockedToastError).toHaveBeenCalledWith(
      'Príspevok môže mať najviac 5 fotiek.',
    );
    // Pri plnom limite už nie je čo pridať.
    expect(screen.queryByTestId('feed-composer-add-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-composer-images-full')).toBeInTheDocument();
  });

  it('shows how many slots are left', async () => {
    renderComposer();

    expect(screen.getByTestId('feed-composer-add-image')).toHaveTextContent('ešte 5');

    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      [imageFile('a.jpg'), imageFile('b.jpg')],
    );

    expect(screen.getByTestId('feed-composer-add-image')).toHaveTextContent('ešte 3');
  });

  it('rejects a photo over the size limit before any request', async () => {
    renderComposer();

    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      imageFile('velka.jpg', 6 * 1024 * 1024),
    );

    expect(mockedToastError).toHaveBeenCalledWith(
      'Fotka je príliš veľká. Maximum je 5 MB.',
    );
    expect(
      screen.queryByTestId('feed-composer-image-preview'),
    ).not.toBeInTheDocument();
  });

  it('counts characters and blocks submitting over the limit', async () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');

    await userEvent.type(textarea, 'Ahoj');
    expect(screen.getByTestId('feed-composer-counter')).toHaveTextContent('4/500');

    // Vloženie dlhého textu naraz – písanie 501 znakov by test zbytočne zdržalo.
    await userEvent.clear(textarea);
    await userEvent.paste('x'.repeat(501));

    expect(screen.getByTestId('feed-composer-counter')).toHaveTextContent('501/500');
    expect(screen.getByTestId('feed-composer-submit')).toBeDisabled();
  });

  it('stays a centered desktop modal', async () => {
    renderComposer();

    const overlay = screen.getByTestId('feed-composer-modal');
    // Spodný panel z mobilu je preč – tú rolu prevzala samostatná routa
    // `feed-post-create`, takže modal je vždy centrovaný.
    expect(overlay.className).toContain('items-center');
    expect(overlay.className).not.toContain('items-end');

    const panel = overlay.firstElementChild as HTMLElement;
    expect(panel.className).toContain('rounded-2xl');
    expect(panel.className).not.toContain('rounded-t-2xl');
    expect(panel.className).toContain('w-full');
  });

  it('inserts an emoji into the caption', async () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');

    await userEvent.type(textarea, 'Ahoj');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať emoji' }));

    await waitFor(() => expect(textarea).toHaveValue('Ahoj🙂'));
  });

  it('drops the emoji button on mobile, keeps it on desktop', () => {
    const { unmount } = render(
      <FeedPostComposerModal open onClose={jest.fn()} />,
    );
    expect(screen.getByLabelText('Pridať emoji')).toBeInTheDocument();
    unmount();

    // Na mobile emoji ponúka systémová klávesnica – appkové tlačidlo by len
    // zaberalo miesto.
    mockIsMobile.mockReturnValue(true);
    render(<FeedPostComposerModal open onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Pridať emoji')).not.toBeInTheDocument();
  });
});

describe('FeedPostComposerModal – text alebo fotka', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedGet.mockReset();
    mockedUpload.mockReset();
    mockedToastError.mockReset();
    mockedToastSuccess.mockReset();
    mockedCreate.mockResolvedValue(created);
    mockedGet.mockResolvedValue(created);
    mockedUpload.mockResolvedValue([]);
  });

  it('enables submitting once a photo is picked, even without text', async () => {
    renderComposer();

    const submit = screen.getByTestId('feed-composer-submit');
    // Prázdny príspevok (ani text, ani fotka) odoslať nejde.
    expect(submit).toBeDisabled();

    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      imageFile(),
    );

    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it('signals the intent to attach a photo when there is no text', async () => {
    renderComposer();

    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      imageFile(),
    );
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    // Fotka v čase vytvárania ešte neexistuje – backend by príspevok bez
    // tohto príznaku odmietol ako prázdny.
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        caption: '',
        taggedUserIds: [],
        willAttachPhoto: true,
      }),
    );
    await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
  });

  it('still refuses a post with neither text nor photo', async () => {
    renderComposer();

    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
