import type { HTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatisticsModule from '../modules/StatisticsModule';
import { User } from '@/types';
import { DashboardSearchPanelProvider } from '../contexts/DashboardSearchPanelContext';

const mockApiGet = jest.fn();

const TREND_URL = '/auth/dashboard/profile-visits-trend/';

jest.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
  endpoints: {
    dashboard: {
      home: '/auth/dashboard/home/',
      profileVisitsTrend: '/auth/dashboard/profile-visits-trend/',
    },
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (_key: string, fallback: string) => fallback,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode } & HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 75,
};

function statsResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      stats: {
        skills_count: 5,
        active_exchanges: 2,
        completed_exchanges: 3,
        completion_rate: 0.6666,
        average_rating: 4.5,
        profile_likes_count: 7,
        favorites_count: 1,
        profile_completeness: 75,
        ...overrides,
      },
    },
  };
}

// 90 unikátnych ISO dní (kľúče v mriežke musia byť jedinečné).
function makeDaily(counts: number[] = []) {
  const base = new Date('2026-04-30T00:00:00Z');
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count: counts[i] ?? 0 };
  });
}

function trendResponse(
  opts: Partial<{
    total_visits_90d: number;
    total_visits_recent_45d: number;
    total_visits_previous_45d: number;
    daily: { date: string; count: number }[];
  }> = {},
) {
  const daily = opts.daily ?? makeDaily();
  return {
    data: {
      total_visits_90d:
        opts.total_visits_90d ?? daily.reduce((s, d) => s + d.count, 0),
      total_visits_recent_45d: opts.total_visits_recent_45d ?? 0,
      total_visits_previous_45d: opts.total_visits_previous_45d ?? 0,
      daily,
    },
  };
}

// Rozlíš odpoveď podľa URL: trend endpoint vs home endpoint.
function routeApi(trend: unknown, home: unknown = statsResponse()) {
  mockApiGet.mockImplementation((url: string) =>
    url === TREND_URL ? Promise.resolve(trend) : Promise.resolve(home),
  );
}

describe('StatisticsModule', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    // Default: pending (loading) – testy, ktoré potrebujú dáta, si ho prepíšu.
    // (Sync testy tak nespustia async setState mimo act.)
    mockApiGet.mockReturnValue(new Promise(() => {}));
  });

  it('omits the mobile welcome content and duplicate Statistics heading', () => {
    render(<StatisticsModule user={mockUser} />);
    expect(screen.queryByText('Vitaj v Svaply!')).not.toBeInTheDocument();
    expect(screen.queryByText(/Toto je tvoj osobný dashboard/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Štatistiky' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Štatistiky' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sleduj svoju aktivitu, úspešnosť výmen a návštevy profilu na jednom mieste.',
      ),
    ).toHaveClass('text-center', 'text-sm', 'dark:text-gray-300');
  });

  it('uses Statistics as the desktop page heading without the welcome card', () => {
    render(<StatisticsModule user={mockUser} variant="desktop-page" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Štatistiky' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sleduj svoju aktivitu, úspešnosť výmen a návštevy profilu na jednom mieste.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Ponuky/dopyty')).toBeInTheDocument();
    expect(screen.getByText('Pridaj ponuku/dopyt')).toBeInTheDocument();
    expect(screen.getByText('Hľadať ponuky/dopyty')).toBeInTheDocument();
    expect(screen.queryByText('Vitaj v Svaply!')).not.toBeInTheDocument();
    expect(screen.queryByText(/Toto je tvoj osobný dashboard/)).not.toBeInTheDocument();
  });

  it('does not render the removed profile-completeness widget', () => {
    render(<StatisticsModule user={mockUser} />);
    expect(screen.queryByText('Kompletnosť profilu')).not.toBeInTheDocument();
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('renders the six stat card labels', () => {
    render(<StatisticsModule user={mockUser} />);
    expect(screen.getByText('Ponuky/dopyty')).toBeInTheDocument();
    expect(screen.getByText('Aktívne výmeny')).toBeInTheDocument();
    expect(screen.getByText('Dokončené výmeny')).toBeInTheDocument();
    expect(screen.getByText('Úspešnosť')).toBeInTheDocument();
    expect(screen.getByText('Priemerné hodnotenie')).toBeInTheDocument();
    expect(screen.getByText('Lajky profilu')).toBeInTheDocument();
  });

  it('renders real stats from dashboard_home_view', async () => {
    mockApiGet.mockResolvedValue(statsResponse());
    render(<StatisticsModule user={mockUser} />);

    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument()); // skills_count
    expect(screen.getByText('2')).toBeInTheDocument(); // active_exchanges
    expect(screen.getByText('3')).toBeInTheDocument(); // completed_exchanges
    // completion_rate 0.6666 → 67 %, formátované podľa locale (sk: nbsp pred %).
    expect(screen.getByText(/^67\s*%$/)).toBeInTheDocument();
    // average_rating 4.5 → lokalizované (sk: desatinná čiarka) + hviezdička.
    expect(screen.getByText(/^4[.,]5\s*★$/)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument(); // profile_likes_count
  });

  it('shows "—" for null completion_rate and average_rating (nie 0%/NaN)', async () => {
    mockApiGet.mockResolvedValue(
      statsResponse({
        skills_count: 0,
        active_exchanges: 0,
        completed_exchanges: 0,
        completion_rate: null,
        average_rating: null,
        profile_likes_count: 0,
      }),
    );
    render(<StatisticsModule user={mockUser} />);

    // completion_rate + average_rating → dve "—".
    await waitFor(() => expect(screen.getAllByText('—')).toHaveLength(2));
    // Ostatné počty sú 0 (skills/active/completed/likes).
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('shows loading placeholders while stats are being fetched', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // nikdy nedokončí
    render(<StatisticsModule user={mockUser} />);

    expect(screen.getAllByTestId('stat-loading')).toHaveLength(6);
    // Obrazovka štatistík funguje aj počas načítania.
    expect(screen.getByRole('region', { name: 'Štatistiky' })).toBeInTheDocument();
  });

  it('degrades gracefully when stats fetch fails (nezhodí obrazovku)', async () => {
    mockApiGet.mockRejectedValue(new Error('boom'));
    render(<StatisticsModule user={mockUser} />);

    await waitFor(() =>
      expect(screen.getByText('Štatistiky sa nepodarilo načítať.')).toBeInTheDocument(),
    );
    // Zvyšok obrazovky ostáva funkčný.
    expect(screen.getByRole('region', { name: 'Štatistiky' })).toBeInTheDocument();
    // Všetkých 6 kariet degraduje na "—".
    expect(screen.getAllByText('—')).toHaveLength(6);
  });

  it('renders quick actions section (nezmenené)', () => {
    render(<StatisticsModule user={mockUser} />);
    expect(screen.getByText('Rýchle akcie')).toBeInTheDocument();
    expect(screen.getByText('Pridaj ponuku/dopyt')).toBeInTheDocument();
    expect(screen.getByText('Hľadať ponuky/dopyty')).toBeInTheDocument();
    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();
    expect(screen.getByText('Správy')).toBeInTheDocument();
  });

  it('wires quick actions to real navigation', () => {
    const setActiveModule = jest.fn();
    const onEditProfileClick = jest.fn();
    const onSkillsOfferClick = jest.fn();
    render(
      <StatisticsModule
        user={mockUser}
        setActiveModule={setActiveModule}
        onEditProfileClick={onEditProfileClick}
        onSkillsOfferClick={onSkillsOfferClick}
      />,
    );

    fireEvent.click(screen.getByText('Pridaj ponuku/dopyt'));
    expect(onSkillsOfferClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Upraviť profil'));
    expect(onEditProfileClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Hľadať ponuky/dopyty'));
    expect(setActiveModule).toHaveBeenCalledWith('search');

    fireEvent.click(screen.getByText('Správy'));
    expect(setActiveModule).toHaveBeenCalledWith('messages');
  });

  it('opens the sidebar search panel from the desktop quick action', () => {
    const setActiveModule = jest.fn();
    const openSearchPanel = jest.fn();

    render(
      <DashboardSearchPanelProvider onOpen={openSearchPanel}>
        <StatisticsModule
          user={mockUser}
          variant="desktop-page"
          setActiveModule={setActiveModule}
        />
      </DashboardSearchPanelProvider>,
    );

    fireEvent.click(screen.getByText('Hľadať ponuky/dopyty'));

    expect(openSearchPanel).toHaveBeenCalledTimes(1);
    expect(setActiveModule).not.toHaveBeenCalled();
  });

  it('keeps the home onboarding target out of the statistics screen', () => {
    render(<StatisticsModule user={mockUser} />);
    const target = document.querySelector('[data-onboarding="home-welcome"]');
    expect(target).not.toBeInTheDocument();
    expect(screen.queryByText('Vitaj v Svaply!')).not.toBeInTheDocument();
  });

  // --- Profile-visits trend (Fáza 4.2) ---

  it('renders the profile-visits heatmap with total and 90 cells', async () => {
    const daily = makeDaily();
    daily[89].count = 3; // dnes
    routeApi(
      trendResponse({
        total_visits_90d: 42,
        total_visits_recent_45d: 30,
        total_visits_previous_45d: 12,
        daily,
      }),
    );
    render(<StatisticsModule user={mockUser} />);

    await waitFor(() =>
      expect(screen.getByTestId('visits-heatmap')).toBeInTheDocument(),
    );
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('návštev za 90 dní')).toBeInTheDocument();
    expect(screen.getAllByTestId('visits-cell')).toHaveLength(90);
    expect(screen.getAllByTestId('visits-weekday-label')).toHaveLength(7);
  });

  it('shows an upward green trend when recent > previous', async () => {
    routeApi(
      trendResponse({ total_visits_recent_45d: 30, total_visits_previous_45d: 12 }),
    );
    render(<StatisticsModule user={mockUser} />);

    const trendEl = await screen.findByTestId('visits-trend');
    expect(trendEl).toHaveAttribute('data-direction', 'up');
    expect(trendEl.className).toContain('text-green-700');
    expect(trendEl).toHaveTextContent('+150%'); // (30-12)/12
  });

  it('applies dark-mode variants to the heatmap (cells + trend)', async () => {
    routeApi(
      trendResponse({ total_visits_recent_45d: 5, total_visits_previous_45d: 2 }),
    );
    render(<StatisticsModule user={mockUser} />);

    // Bunky mriežky majú dark: variant → nemiznú na tmavom pozadí.
    const cells = await screen.findAllByTestId('visits-cell');
    expect(cells.every((c) => c.className.includes('dark:bg-'))).toBe(true);
    // Trend (rastúci) má tmavý variant zelenej.
    expect(screen.getByTestId('visits-trend').className).toContain(
      'dark:text-green-400',
    );
  });

  it('shows a downward red trend when recent < previous', async () => {
    routeApi(
      trendResponse({ total_visits_recent_45d: 6, total_visits_previous_45d: 12 }),
    );
    render(<StatisticsModule user={mockUser} />);

    const trendEl = await screen.findByTestId('visits-trend');
    expect(trendEl).toHaveAttribute('data-direction', 'down');
    expect(trendEl.className).toContain('text-red-700');
    expect(trendEl).toHaveTextContent('-50%'); // (6-12)/12
  });

  it('shows a flat neutral trend when recent == previous', async () => {
    routeApi(
      trendResponse({ total_visits_recent_45d: 10, total_visits_previous_45d: 10 }),
    );
    render(<StatisticsModule user={mockUser} />);

    const trendEl = await screen.findByTestId('visits-trend');
    expect(trendEl).toHaveAttribute('data-direction', 'flat');
    expect(trendEl.className).toContain('text-gray-500');
    expect(trendEl).toHaveTextContent('0%');
  });

  it('shows "nové" (up) when previous is 0 and recent > 0 (no Infinity/NaN)', async () => {
    // Používateľ predtým nemal návštevy, teraz áno → „nové", nie delenie nulou.
    routeApi(
      trendResponse({ total_visits_recent_45d: 5, total_visits_previous_45d: 0 }),
    );
    render(<StatisticsModule user={mockUser} />);

    const trendEl = await screen.findByTestId('visits-trend');
    expect(trendEl).toHaveAttribute('data-direction', 'up');
    expect(trendEl).toHaveTextContent('nové');
    expect(trendEl.textContent).not.toMatch(/Infinity|NaN|%/);
  });

  it('renders the heatmap grid even with no activity (all zeros)', async () => {
    routeApi(
      trendResponse({
        total_visits_90d: 0,
        total_visits_recent_45d: 0,
        total_visits_previous_45d: 0,
      }),
    );
    render(<StatisticsModule user={mockUser} />);

    await waitFor(() =>
      expect(screen.getByTestId('visits-heatmap')).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('visits-cell')).toHaveLength(90);
    expect(screen.getByTestId('visits-trend')).toHaveAttribute(
      'data-direction',
      'flat',
    );
  });

  it('exposes a localized day detail for mouse, keyboard and touch selection', async () => {
    const daily = makeDaily();
    daily[10].count = 3;
    routeApi(trendResponse({ daily }));
    render(<StatisticsModule user={mockUser} />);

    const cells = await screen.findAllByTestId('visits-cell');
    fireEvent.click(cells[10]);

    expect(cells[10]).toHaveAttribute('aria-pressed', 'true');
    expect(cells[10]).toHaveAccessibleName(/Počet návštev: 3/);
    expect(screen.getByTestId('visits-day-detail')).toHaveTextContent(
      'Počet návštev: 3',
    );
  });

  it('includes responsive and dark-mode surfaces for statistics cards', () => {
    render(<StatisticsModule user={mockUser} />);

    const statisticsGrid = screen.getByText('Ponuky/dopyty').parentElement?.parentElement;
    const firstCard = screen.getByText('Ponuky/dopyty').parentElement;

    expect(screen.getByRole('region', { name: 'Štatistiky' })).toBeInTheDocument();
    expect(statisticsGrid).toHaveClass('grid-cols-2', 'md:grid-cols-3');
    expect(firstCard).toHaveClass('p-4', 'sm:p-5', 'dark:bg-[#101011]');
  });

  it('shows a loading skeleton while the trend is being fetched', () => {
    // default beforeEach: pending promise → trend loading
    render(<StatisticsModule user={mockUser} />);
    expect(screen.getByTestId('visits-trend-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('visits-heatmap')).not.toBeInTheDocument();
  });

  it('hides the trend section when the fetch fails (fail-open)', async () => {
    mockApiGet.mockImplementation((url: string) =>
      url === TREND_URL
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(statsResponse()),
    );
    render(<StatisticsModule user={mockUser} />);

    // Zvyšok obrazovky ostáva funkčný.
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    // Skeleton zmizne a heatmapa sa nezobrazí.
    await waitFor(() =>
      expect(
        screen.queryByTestId('visits-trend-loading'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('visits-heatmap')).not.toBeInTheDocument();
  });

  it('hides the trend section when the response shape is unexpected (no daily)', async () => {
    // Trend endpoint vráti stats-tvar bez `daily` → guard skryje sekciu (fail-open).
    routeApi(statsResponse());
    render(<StatisticsModule user={mockUser} />);

    await waitFor(() =>
      expect(
        screen.queryByTestId('visits-trend-loading'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('visits-heatmap')).not.toBeInTheDocument();
  });
});
