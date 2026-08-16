/**
 * Profilové taby „Príspevky" a „Označený" (Fáza 4.5).
 *
 * Overuje sa: neaktívny tab nesťahuje nič, správny zdroj pre každý tab,
 * donačítanie ďalšej stránky, prázdny stav (vlastný vs. cudzí profil),
 * chybový stav a to, že prechod na iný profil dáta naozaj prenačíta.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProfileFeedSection from './ProfileFeedSection';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  listUserFeedPosts: jest.fn(),
  listUserTaggedFeedPosts: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

// Karta má vlastné testy; tu ide o zoznam, nie o jej vnútro.
jest.mock('../feed/FeedPostCard', () => ({
  __esModule: true,
  default: ({
    post,
    onSelfTagRemoved,
    onDeleted,
  }: {
    post: { id: number; caption?: string };
    onSelfTagRemoved?: (postId: number) => void;
    onDeleted?: (postId: number) => void;
  }) => (
    <article data-testid={`post-${post.id}`}>
      {post.caption}
      <button
        type="button"
        data-testid={`remove-tag-${post.id}`}
        disabled={!onSelfTagRemoved}
        onClick={() => onSelfTagRemoved?.(post.id)}
      >
        remove tag
      </button>
      <button
        type="button"
        data-testid={`delete-post-${post.id}`}
        disabled={!onDeleted}
        onClick={() => onDeleted?.(post.id)}
      >
        delete post
      </button>
    </article>
  ),
}));

const api = jest.requireMock('@/lib/feedApi');
const mockedPosts = api.listUserFeedPosts as jest.Mock;
const mockedTagged = api.listUserTaggedFeedPosts as jest.Mock;

function post(id: number, caption: string): FeedPost {
  return { id, caption } as unknown as FeedPost;
}

function page(results: FeedPost[], next: string | null = null) {
  return { results, next, previous: null };
}

beforeEach(() => {
  mockedPosts.mockReset();
  mockedTagged.mockReset();
});

it('renders nothing and fetches nothing while its tab is inactive', () => {
  mockedPosts.mockResolvedValue(page([post(1, 'A')]));

  const { container } = render(
    <ProfileFeedSection activeTab="portfolio" tab="posts" ownerUserId={7} />,
  );

  expect(container).toBeEmptyDOMElement();
  expect(mockedPosts).not.toHaveBeenCalled();
});

it('loads the profile posts of the given user when its tab opens', async () => {
  mockedPosts.mockResolvedValue(page([post(1, 'Prvý'), post(2, 'Druhý')]));

  render(<ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={7} />);

  expect(await screen.findByTestId('post-1')).toBeInTheDocument();
  expect(screen.getByTestId('post-2')).toBeInTheDocument();
  expect(mockedPosts).toHaveBeenCalledWith(7, expect.anything());
  // Tab „Označený" je iný endpoint – nesmie sa zavolať.
  expect(mockedTagged).not.toHaveBeenCalled();
});

it('uses the tagged endpoint for the tagged tab', async () => {
  mockedTagged.mockResolvedValue(page([post(9, 'Označený príspevok')]));

  render(<ProfileFeedSection activeTab="tagged" tab="tagged" ownerUserId={7} />);

  expect(await screen.findByTestId('post-9')).toBeInTheDocument();
  expect(mockedTagged).toHaveBeenCalledWith(7, expect.anything());
  expect(mockedPosts).not.toHaveBeenCalled();
});

it('loads the next cursor page', async () => {
  mockedPosts
    .mockResolvedValueOnce(page([post(1, 'Prvý')], 'http://api.test/next'))
    .mockResolvedValueOnce(page([post(2, 'Druhý')]));

  render(<ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={7} />);
  await screen.findByTestId('post-1');

  // jsdom nemá IntersectionObserver – donačítanie spúšťa fallback tlačidlo,
  // ktoré je z rovnakého dôvodu v UI aj pre reálnych používateľov.
  await userEvent.click(screen.getByRole('button', { name: 'Zobraziť ďalšie' }));

  expect(await screen.findByTestId('post-2')).toBeInTheDocument();
  expect(screen.getByTestId('post-1')).toBeInTheDocument();
  expect(mockedPosts).toHaveBeenLastCalledWith(7, {
    cursorUrl: 'http://api.test/next',
  });
});

it('shows a neutral empty state on someone else profile', async () => {
  mockedTagged.mockResolvedValue(page([]));

  render(
    <ProfileFeedSection
      activeTab="tagged"
      tab="tagged"
      ownerUserId={7}
      isOtherUserProfile
    />,
  );

  expect(await screen.findByTestId('profile-feed-empty-tagged')).toHaveTextContent(
    'Tohto používateľa zatiaľ nikto neoznačil v príspevku.',
  );
});

it('addresses the owner directly in the empty state of their own profile', async () => {
  mockedTagged.mockResolvedValue(page([]));

  render(<ProfileFeedSection activeTab="tagged" tab="tagged" ownerUserId={7} />);

  expect(await screen.findByTestId('profile-feed-empty-tagged')).toHaveTextContent(
    'Zatiaľ ťa nikto neoznačil v príspevku.',
  );
});

it('offers a retry when the first page fails', async () => {
  mockedPosts
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce(page([post(1, 'Prvý')]));

  render(<ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={7} />);

  await userEvent.click(await screen.findByRole('button', { name: 'Skúsiť znova' }));

  expect(await screen.findByTestId('post-1')).toBeInTheDocument();
});

it('reloads when the profile changes under the same tab', async () => {
  mockedPosts
    .mockResolvedValueOnce(page([post(1, 'Od prvého')]))
    .mockResolvedValueOnce(page([post(2, 'Od druhého')]));

  const { rerender } = render(
    <ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={7} />,
  );
  await screen.findByTestId('post-1');

  rerender(<ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={8} />);

  // Bez prenačítania by tu ostali príspevky predošlého profilu.
  expect(await screen.findByTestId('post-2')).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByTestId('post-1')).not.toBeInTheDocument(),
  );
  expect(mockedPosts).toHaveBeenLastCalledWith(8, expect.anything());
});

it('drops the post from the tagged tab once the user removes their tag', async () => {
  mockedTagged.mockResolvedValue(page([post(1, 'Prvý'), post(2, 'Druhý')]));

  render(<ProfileFeedSection activeTab="tagged" tab="tagged" ownerUserId={7} />);
  await screen.findByTestId('post-1');

  await userEvent.click(screen.getByTestId('remove-tag-1'));

  // Zoznam je filtrovaný na „kde som označený" – bez označenia tam už nepatrí.
  await waitFor(() =>
    expect(screen.queryByTestId('post-1')).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId('post-2')).toBeInTheDocument();
  // Žiadny refetch – zoznam sa upravil lokálne.
  expect(mockedTagged).toHaveBeenCalledTimes(1);
});

it('leaves the post in place in the posts tab', async () => {
  mockedPosts.mockResolvedValue(page([post(1, 'Prvý')]));

  render(<ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={7} />);
  await screen.findByTestId('post-1');

  // Tab „Príspevky" nefiltruje podľa označenia, takže tam callback nechodí –
  // zmizne iba chip na karte.
  expect(screen.getByTestId('remove-tag-1')).toBeDisabled();
});

it('keeps the post on someone else profile when only my own tag goes', async () => {
  // Príspevok nesie tagy pre vlastníka profilu AJ pre mňa. Zoznam je
  // filtrovaný na vlastníkove označenia – to moje odstránenie neruší.
  mockedTagged.mockResolvedValue(page([post(1, 'Prvý'), post(2, 'Druhý')]));

  render(
    <ProfileFeedSection
      activeTab="tagged"
      tab="tagged"
      ownerUserId={7}
      isOtherUserProfile
    />,
  );
  await screen.findByTestId('post-1');

  // Callback sa na cudzí profil vôbec neposiela – karta si odstráni len chip.
  expect(screen.getByTestId('remove-tag-1')).toBeDisabled();
  expect(screen.getByTestId('post-1')).toBeInTheDocument();
});

it('drops the post from my own tagged tab, as before', async () => {
  mockedTagged.mockResolvedValue(page([post(1, 'Prvý'), post(2, 'Druhý')]));

  render(<ProfileFeedSection activeTab="tagged" tab="tagged" ownerUserId={7} />);
  await screen.findByTestId('post-1');

  await userEvent.click(screen.getByTestId('remove-tag-1'));

  await waitFor(() =>
    expect(screen.queryByTestId('post-1')).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId('post-2')).toBeInTheDocument();
});

it('drops a deleted post from the list in both tabs', async () => {
  mockedPosts.mockResolvedValue(page([post(1, 'Prvý'), post(2, 'Druhý')]));

  render(<ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={7} />);
  await screen.findByTestId('post-1');

  await userEvent.click(screen.getByTestId('delete-post-1'));

  await waitFor(() =>
    expect(screen.queryByTestId('post-1')).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId('post-2')).toBeInTheDocument();
});
