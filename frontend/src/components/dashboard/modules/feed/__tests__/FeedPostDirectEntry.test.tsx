/**
 * Stránka `/dashboard/feed/<id>` (odkaz, F5, upozornenie).
 *
 * Adresa príspevku je Nástenka a nad ňou detail príspevku: okno na počítači, obrazovka na mobile (nález 360). Stránka preto
 * dashboardu nepodáva ani modul detailu, ani číslo príspevku: obe si dashboard prečíta z adresy (`usePathModuleEffects`).
 * Strážny test tabuľky trás (`dashboardRoutes.test.tsx`) drží stránku zhodnú s tabuľkou; tento test drží, že sa na stránku
 * nevráti starý modul `feed-post-detail` ani číslo príspevku v props.
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

it('priamy odkaz na príspevok ukáže dashboard na Nástenke, bez modulu detailu a bez čísla príspevku', () => {
  render(<FeedPostPage />);

  expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  expect(dashboardProps).toHaveBeenCalledTimes(1);
  expect(dashboardProps.mock.calls[0][0]).toEqual({ initialRoute: 'home' });
});
