/**
 * Composer na mobile ako samostatná routa (`feed-post-create`).
 *
 * Vzor prevzatý z `portfolio-create`: obal je celá stránka, nie panel.
 * Vnútro je ten istý `FeedPostComposerForm` ako v desktopovom modale, takže
 * sa tu overuje OBAL a navigácia, nie znovu celá logika composera.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCreateScreen from '../FeedPostCreateScreen';
import { createFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  createFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  FEED_IMAGE_ACCEPT: 'image/*',
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_MAX_MB: 5,
  MAX_FEED_POST_IMAGES: 5,
  isAllowedFeedImageName: () => true,
  uploadFeedPostImages: jest.fn().mockResolvedValue([]),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div data-testid="group-user-picker" />,
}));

const mockedCreate = createFeedPost as jest.MockedFunction<typeof createFeedPost>;

const created = { id: 77, caption: 'Ahoj' } as unknown as FeedPost;

beforeEach(() => {
  jest.clearAllMocks();
  mockedCreate.mockResolvedValue(created);
});

it('renders as a full page with its own header, not a dialog', () => {
  render(<FeedPostCreateScreen onClose={jest.fn()} />);

  expect(screen.getByTestId('feed-post-create-screen')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nový príspevok' })).toBeInTheDocument();
  // Žiadny modal ani prekrytie – toto je routa.
  expect(screen.queryByTestId('feed-composer-modal')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('carries the whole composer, not a reduced version of it', () => {
  render(<FeedPostCreateScreen onClose={jest.fn()} />);

  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.getByLabelText('Pridať emoji')).toBeInTheDocument();
  expect(screen.getByTestId('feed-composer-add-image')).toBeInTheDocument();
  expect(screen.getByTestId('feed-composer-tag-picker')).toBeInTheDocument();
  expect(screen.getByTestId('feed-composer-submit')).toBeInTheDocument();
});

it('goes back to the feed from the back button', async () => {
  const onClose = jest.fn();
  render(<FeedPostCreateScreen onClose={onClose} />);

  await userEvent.click(screen.getByTestId('feed-post-create-back'));

  expect(onClose).toHaveBeenCalled();
});

it('creates the post exactly like the modal does and returns to the feed', async () => {
  const onClose = jest.fn();
  const onCreated = jest.fn();
  render(<FeedPostCreateScreen onClose={onClose} onCreated={onCreated} />);

  await userEvent.type(screen.getByRole('textbox'), 'Z mobilu');
  await userEvent.click(screen.getByTestId('feed-composer-submit'));

  await waitFor(() =>
    expect(mockedCreate).toHaveBeenCalledWith({
      caption: 'Z mobilu',
      taggedUserIds: [],
      willAttachPhoto: false,
    }),
  );
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  // Po uverejnení sa obrazovka zavrie – používateľ je späť na Nástenke.
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});
