/**
 * Priamy vstup na `/dashboard/feed/<id>` – pôvodná celoobrazovková stránka.
 *
 * Okno detailu je vrstva NAD bežiacou appkou; pri priamom otvorení odkazu
 * (nová záložka, obnovenie stránky, mobil) žiadna appka pod ním nebeží, takže
 * musí ostať fungovať pôvodná stránka. Tento test drží tú vetvu nažive – aby
 * ju prechod na okno ticho nevyradil.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostPage from '@/app/dashboard/feed/[postId]/page';

const dashboardProps = jest.fn();

jest.mock('@/components/dashboard/Dashboard', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    dashboardProps(props);
    return <div data-testid="dashboard" />;
  },
}));

beforeEach(() => {
  dashboardProps.mockReset();
});

it('opens the full-page detail module for a direct link', () => {
  render(<FeedPostPage params={{ postId: '7' }} />);

  expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  expect(dashboardProps).toHaveBeenCalledWith(
    expect.objectContaining({
      initialRoute: 'feed-post-detail',
      initialFeedPostId: 7,
    }),
  );
});

it('passes no id when the URL carries junk', () => {
  render(<FeedPostPage params={{ postId: 'abc' }} />);

  expect(dashboardProps).toHaveBeenCalledWith(
    expect.objectContaining({ initialFeedPostId: null }),
  );
});
