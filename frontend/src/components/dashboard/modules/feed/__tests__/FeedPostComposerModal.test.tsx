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
import { uploadFeedPostImage } from '@/lib/feedImageUpload';

jest.mock('@/lib/feedApi', () => ({
  createFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImage: jest.fn(),
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: 'image/*',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
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
const mockedUpload = uploadFeedPostImage as jest.MockedFunction<
  typeof uploadFeedPostImage
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
    mockedCreate.mockResolvedValue(created);
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
    });
    expect(mockedUpload).not.toHaveBeenCalled();
    expect(mockedToastSuccess).toHaveBeenCalled();
  });

  it('creates the post first, then uploads the photo, on a single click', async () => {
    const withImage = { ...created, image: { status: 'pending' } } as FeedPost;
    mockedUpload.mockResolvedValue({ id: 77, image_status: 'pending' });
    mockedGet.mockResolvedValue(withImage);
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'S fotkou');
    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      imageFile(),
    );
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    // Poradie je podstatné: upload potrebuje id príspevku, ktorý musí
    // existovať skôr – používateľ o tom nevie, klikol raz.
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedUpload).toHaveBeenCalledWith(77, expect.any(File));
    // Po uploade sa príspevok načíta znova, nech karta ukáže stav fotky.
    expect(onCreated).toHaveBeenCalledWith(withImage);
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
    });
  });

  it('keeps the post when only the upload fails, and says so', async () => {
    mockedUpload.mockRejectedValue(new Error('S3 down'));
    const onCreated = renderComposer();

    await userEvent.type(screen.getByRole('textbox'), 'Text ostáva');
    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      imageFile(),
    );
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    // Príspevok vznikol, takže sa musí objaviť vo feede – zmizol by len text.
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(mockedToastError).toHaveBeenCalledWith(
      'Príspevok bol uverejnený, ale fotku sa nepodarilo nahrať.',
    );
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

  it('previews the chosen photo and allows removing it', async () => {
    renderComposer();

    await userEvent.upload(
      screen.getByTestId('feed-composer-file-input'),
      imageFile('dovolenka.jpg'),
    );

    const preview = await screen.findByTestId('feed-composer-image-preview');
    expect(within(preview).getByText('dovolenka.jpg')).toBeInTheDocument();

    await userEvent.click(within(preview).getByRole('button', { name: 'Odstrániť' }));

    expect(
      screen.queryByTestId('feed-composer-image-preview'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-composer-add-image')).toBeInTheDocument();
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

  it('is a bottom sheet on mobile and a centered modal on desktop', async () => {
    renderComposer();

    const overlay = screen.getByTestId('feed-composer-modal');
    // Mobil: panel prisadnutý k spodku; desktop (sm:) sa centruje.
    expect(overlay.className).toContain('items-end');
    expect(overlay.className).toContain('sm:items-center');

    const panel = overlay.firstElementChild as HTMLElement;
    // Mobil má zaoblený len horný okraj (panel vychádza zdola), desktop celý.
    expect(panel.className).toContain('rounded-t-2xl');
    expect(panel.className).toContain('sm:rounded-2xl');
    expect(panel.className).toContain('w-full');
  });

  it('inserts an emoji into the caption', async () => {
    renderComposer();
    const textarea = screen.getByRole('textbox');

    await userEvent.type(textarea, 'Ahoj');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať emoji' }));

    await waitFor(() => expect(textarea).toHaveValue('Ahoj🙂'));
  });
});
