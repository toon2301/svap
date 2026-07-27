import type { HTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeModule from '../modules/HomeModule';
import { User } from '@/types';

const mockApiGet = jest.fn();

jest.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
  endpoints: { dashboard: { home: '/auth/dashboard/home/' } },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
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

describe('HomeModule', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    // Default: pending (loading) – testy, ktoré potrebujú dáta, si ho prepíšu.
    // (Sync testy tak nespustia async setState mimo act.)
    mockApiGet.mockReturnValue(new Promise(() => {}));
  });

  it('renders welcome message with user name', () => {
    render(<HomeModule user={mockUser} />);
    expect(screen.getByText('Vitaj v Svaply!')).toBeInTheDocument();
    expect(screen.getByText(/Toto je tvoj osobný dashboard/)).toBeInTheDocument();
  });

  it('displays profile completeness from user prop (nezmenené)', () => {
    render(<HomeModule user={mockUser} />);
    expect(screen.getByText('Kompletnosť profilu')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(
      screen.getByText('Dokončite svoj profil pre lepšiu viditeľnosť'),
    ).toBeInTheDocument();
  });

  it('renders the six stat card labels', () => {
    render(<HomeModule user={mockUser} />);
    expect(screen.getByText('Ponuky')).toBeInTheDocument();
    expect(screen.getByText('Aktívne výmeny')).toBeInTheDocument();
    expect(screen.getByText('Dokončené výmeny')).toBeInTheDocument();
    expect(screen.getByText('Úspešnosť')).toBeInTheDocument();
    expect(screen.getByText('Priemerné hodnotenie')).toBeInTheDocument();
    expect(screen.getByText('Lajky profilu')).toBeInTheDocument();
  });

  it('renders real stats from dashboard_home_view', async () => {
    mockApiGet.mockResolvedValue(statsResponse());
    render(<HomeModule user={mockUser} />);

    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument()); // skills_count
    expect(screen.getByText('2')).toBeInTheDocument(); // active_exchanges
    expect(screen.getByText('3')).toBeInTheDocument(); // completed_exchanges
    expect(screen.getByText('67%')).toBeInTheDocument(); // completion_rate 0.6666 → 67%
    expect(screen.getByText('4.5 ★')).toBeInTheDocument(); // average_rating
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
    render(<HomeModule user={mockUser} />);

    // completion_rate + average_rating → dve "—".
    await waitFor(() => expect(screen.getAllByText('—')).toHaveLength(2));
    // Ostatné počty sú 0 (skills/active/completed/likes).
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('shows loading placeholders while stats are being fetched', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // nikdy nedokončí
    render(<HomeModule user={mockUser} />);

    expect(screen.getAllByTestId('stat-loading')).toHaveLength(6);
    // Nástenka funguje aj počas načítania (welcome + completeness).
    expect(screen.getByText('Vitaj v Svaply!')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('degrades gracefully when stats fetch fails (nezhodí nástenku)', async () => {
    mockApiGet.mockRejectedValue(new Error('boom'));
    render(<HomeModule user={mockUser} />);

    await waitFor(() =>
      expect(screen.getByText('Štatistiky sa nepodarilo načítať.')).toBeInTheDocument(),
    );
    // Zvyšok nástenky ostáva funkčný.
    expect(screen.getByText('Vitaj v Svaply!')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    // Všetkých 6 kariet degraduje na "—".
    expect(screen.getAllByText('—')).toHaveLength(6);
  });

  it('renders quick actions section (nezmenené)', () => {
    render(<HomeModule user={mockUser} />);
    expect(screen.getByText('Rýchle akcie')).toBeInTheDocument();
    expect(screen.getByText('Pridať zručnosť')).toBeInTheDocument();
    expect(screen.getByText('Hľadať zručnosti')).toBeInTheDocument();
    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();
    expect(screen.getByText('Správy')).toBeInTheDocument();
  });

  it('wires quick actions to real navigation', () => {
    const setActiveModule = jest.fn();
    const onEditProfileClick = jest.fn();
    const onSkillsOfferClick = jest.fn();
    render(
      <HomeModule
        user={mockUser}
        setActiveModule={setActiveModule}
        onEditProfileClick={onEditProfileClick}
        onSkillsOfferClick={onSkillsOfferClick}
      />,
    );

    fireEvent.click(screen.getByText('Pridať zručnosť'));
    expect(onSkillsOfferClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Upraviť profil'));
    expect(onEditProfileClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Hľadať zručnosti'));
    expect(setActiveModule).toHaveBeenCalledWith('search');

    fireEvent.click(screen.getByText('Správy'));
    expect(setActiveModule).toHaveBeenCalledWith('messages');
  });

  it('welcome section carries the mobile-onboarding target (home-welcome)', () => {
    render(<HomeModule user={mockUser} />);
    const target = document.querySelector('[data-onboarding="home-welcome"]');
    expect(target).toBeInTheDocument();
    // Target je len uvítacia sekcia, nie celý komponent (obsahuje welcome text).
    expect(target).toHaveTextContent('Vitaj v Svaply!');
  });
});
