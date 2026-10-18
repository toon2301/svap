import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchUsersResults, type GlobalSearchUser } from './SearchUsersResults';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? '' }),
}));
jest.mock('@/components/shared/VerifiedBadge', () => ({
  __esModule: true,
  default: () => <span data-testid="verified-badge" />,
}));

function show(users: GlobalSearchUser[], extra: Partial<React.ComponentProps<typeof SearchUsersResults>> = {}) {
  return render(<SearchUsersResults title="People" users={users} {...extra} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/search?q=example');
});

describe('Search users actual result and loading boundaries', () => {
  it('marks loading independently of placeholder height and removes it when data arrives', () => {
    const view = show([], { loading: true, count: 0 });
    const section = screen.getByText('People').closest('section');
    expect(section).toHaveAttribute('data-search-loading', 'true');
    expect(section?.querySelectorAll('.animate-pulse')).toHaveLength(6);
    expect(screen.getByText('0 výsledkov')).toBeInTheDocument();
    expect(screen.queryByText('Žiadni používatelia.')).not.toBeInTheDocument();

    view.rerender(<SearchUsersResults title="People" users={[{ id: 1, display_name: 'Ada' }]} loading={false} />);
    expect(section).not.toHaveAttribute('data-search-loading');
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('renders the empty state without a numeric count or loading marker', () => {
    show([], { count: null });
    expect(screen.getByText('Žiadni používatelia.')).toBeInTheDocument();
    expect(screen.getByText('People').closest('section')).not.toHaveAttribute('data-search-loading');
    expect(screen.queryByText(/výsledkov/)).not.toBeInTheDocument();
  });

  it('defensively treats an invalid collection as empty', () => {
    show(null as unknown as GlobalSearchUser[]);
    expect(screen.getByText('Žiadni používatelia.')).toBeInTheDocument();
  });

  it('renders real names, initials, canonical identifiers and locality fallbacks', () => {
    show([
      { id: 1, display_name: '  Ada Lovelace  ', slug: ' ada ', user_type: 'individual', location: ' London ' },
      { id: 2, display_name: 'Grace', user_type: 'company', district: ' Nitra ', is_verified: true },
      { id: 3, display_name: null, slug: '', user_type: 'custom', avatar_url: 'https://example.test/avatar.jpg' },
      { id: 4, display_name: '', user_type: null, location: null, district: null },
    ]);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Nitra')).toBeInTheDocument();
    expect(screen.getAllByText('Firma')).toHaveLength(2);
    expect(screen.getAllByText('Osoba')).toHaveLength(2);
    expect(screen.getAllByText('custom')).toHaveLength(2);
    expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Používateľ #3' })).toHaveAttribute('src', 'https://example.test/avatar.jpg');
    expect(screen.getByText('Používateľ #4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ada Lovelace'));
    expect(mockPush).toHaveBeenLastCalledWith('/dashboard/users/ada');
    fireEvent.click(screen.getByText('Grace'));
    expect(mockPush).toHaveBeenLastCalledWith('/dashboard/users/2');
  });

  it('keeps own-user labeling independent of missing names and supports Space without handling unrelated keys', () => {
    show([{ id: 1 }, { id: 2, display_name: 'Other', slug: 'other' }], { currentUserId: 1 });
    expect(screen.getByText('Vy')).toBeInTheDocument();
    const other = screen.getByText('Other').closest('[role="button"]')!;
    fireEvent.keyDown(other, { key: 'ArrowDown' });
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.keyDown(other, { key: ' ' });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/other');
    fireEvent.keyDown(other, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it('exposes only HTTP(S) social links and does not open the profile when a link is used', () => {
    show([{
      id: 1,
      display_name: 'Social User',
      facebook: ' https://facebook.com/example ',
      instagram: 'https://instagram.com/example',
      linkedin: 'http://linkedin.com/in/example',
      youtube: 'https://youtube.com/@example',
    }]);
    for (const label of ['Facebook', 'Instagram', 'LinkedIn', 'YouTube']) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      fireEvent.mouseDown(link);
      fireEvent.click(link);
    }
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/example');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ignores absent, malformed and unsafe external URLs', () => {
    show([{
      id: 1,
      display_name: 'Unsafe links',
      facebook: 'javascript:alert(1)',
      instagram: 'not a url',
      linkedin: 'ftp://example.test/file',
      youtube: '',
    }, { id: 2, display_name: 'No social links', facebook: null }]);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
