import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeModule from '../modules/HomeModule';
import { listFeedPosts } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  listFeedPosts: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedListFeedPosts = listFeedPosts as jest.MockedFunction<typeof listFeedPosts>;

describe('HomeModule', () => {
  beforeEach(() => {
    mockedListFeedPosts.mockResolvedValue({
      results: [],
      next: null,
      previous: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the feed root and preserves the home onboarding target', async () => {
    render(<HomeModule />);

    expect(screen.getByRole('heading', { name: 'Nástenka' })).toBeInTheDocument();
    expect(screen.getByTestId('home-feed-root')).toHaveAttribute(
      'data-onboarding',
      'home-welcome',
    );
    expect(screen.queryByText('Štatistiky')).not.toBeInTheDocument();

    // Onboarding target musí prežiť aj po tom, čo sa feed dorenderuje.
    await waitFor(() => {
      expect(screen.getByTestId('feed-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('home-feed-root')).toHaveAttribute(
      'data-onboarding',
      'home-welcome',
    );
  });

  it('mounts the feed below the title', async () => {
    render(<HomeModule />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-empty-state')).toBeInTheDocument();
    });

    const root = screen.getByTestId('home-feed-root');
    const heading = screen.getByRole('heading', { name: 'Nástenka' });
    const feed = screen.getByTestId('feed-empty-state');

    expect(root).toContainElement(feed);
    // Skutočné poradie v DOM, nie len vnorenie: nadpis musí predchádzať feedu.
    expect(
      heading.compareDocumentPosition(feed) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
