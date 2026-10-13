import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type Sidebar from '@/components/dashboard/Sidebar';
import type SearchModule from '@/components/dashboard/modules/SearchModule';
import { SearchLayout } from './SearchLayout';

const mockPush = jest.fn();
const mockLogout = jest.fn();
let mockUser: { id: number; slug?: string | null } | null;
let mockSidebarProps: ComponentProps<typeof Sidebar>;
let mockSearchProps: ComponentProps<typeof SearchModule>;

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));
jest.mock('@/components/dashboard/contexts/RequestsNotificationsContext', () => ({
  RequestsNotificationsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useRequestsNotifications: () => ({ unreadCount: 0, markAllRead: jest.fn() }),
  useMessagesNotifications: () => ({ unreadCount: 0 }),
  useNotificationsUnread: () => ({ unreadCount: 0 }),
}));

// Retain the REAL Sidebar and its click handler; capture props only for unknown-ID guards.
jest.mock('@/components/dashboard/Sidebar', () => {
  const RealSidebar = jest.requireActual('@/components/dashboard/Sidebar').default;
  return {
    __esModule: true,
    /** Render the actual navigation without polling unread APIs. */
    default: (props: ComponentProps<typeof Sidebar>) => {
      mockSidebarProps = props;
      return <RealSidebar {...props} />;
    },
  };
});

// Search/API fetching is outside this layout regression; exercise its real parent callbacks.
jest.mock('@/components/dashboard/modules/SearchModule', () => ({
  __esModule: true,
  /** Expose child actions while keeping network requests out of the layout test. */
  default: (props: ComponentProps<typeof SearchModule>) => {
    mockSearchProps = props;
    return (
      <div data-testid="search-child" data-active={String(props.isActive)}>
        <input aria-label="Vyhľadávací dopyt" />
        <button onClick={props.onClose}>Zatvoriť panel</button>
        <button onClick={() => props.onUserClick?.(21, 'result-user')}>Otvoriť používateľa</button>
        <button onClick={() => props.onSkillClick?.(21, 63, 'result-user')}>Otvoriť kartu</button>
      </div>
    );
  },
}));

/** Mount the layout with the real theme context and a clickable outside region. */
function renderLayout() {
  const view = render(
    <ThemeProvider>
      <SearchLayout>
        <button>Výsledky stránky</button>
      </SearchLayout>
    </ThemeProvider>,
  );
  const sidebar = view.container.querySelector('[data-sidebar="left"]')!;
  const panel = sidebar.nextElementSibling!;
  return { ...view, panel };
}

/** Select a real Sidebar button by its stable route identifier, independent of translations. */
function navButton(id: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`[data-sidebar-nav-item="${id}"]`)!;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 105, slug: 'test-user' };
  document.body.classList.remove('filter-modal-open');
  document.documentElement.classList.remove('dark');
  window.history.replaceState(null, '', '/search?q=te');
});

afterEach(() => {
  jest.restoreAllMocks();
  document.body.classList.remove('filter-modal-open');
  window.history.replaceState(null, '', '/');
});

describe('SearchLayout → Sledovania: real Sidebar integration', () => {
  it.each(['open', 'closed', 'reopened'])('navigates once with the search panel %s', async (state) => {
    const user = userEvent.setup();
    const { panel } = renderLayout();
    if (state !== 'open') await user.click(screen.getByRole('button', { name: 'Zatvoriť panel' }));
    if (state === 'reopened') await user.click(navButton('search'));
    expect(panel).toHaveAttribute('aria-hidden', String(state === 'closed'));

    // Includes mousedown, which closes the overlay before the click is handled.
    await user.click(navButton('watches'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/watches');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    '/search?q=te&tab=users',
    '/search?q=te&tab=offers&type=offer&price_min=5&price_max=10',
    '/search?q=dlhy%20dopyt&onlyMyLocation=true',
  ])('does not carry search parameters into watches from %s', (url) => {
    window.history.replaceState(null, '', url);
    renderLayout();
    fireEvent.click(navButton('watches'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/watches');
  });

  it('activates Sledovania from the keyboard without a second navigation', async () => {
    const user = userEvent.setup();
    renderLayout();
    navButton('watches').focus();
    await user.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/watches');
  });

  it('still reaches watches if authentication data is temporarily unavailable', () => {
    mockUser = null;
    renderLayout();
    expect(screen.queryByTestId('search-child')).not.toBeInTheDocument();
    fireEvent.click(navButton('watches'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/watches');
  });
});

describe('SearchLayout: preserve existing navigation', () => {
  it.each([
    ['home', '/dashboard'],
    ['favorites', '/dashboard/favorites'],
    ['requests', '/dashboard/requests'],
    ['profile', '/dashboard/users/test-user'],
    ['settings', '/dashboard/settings'],
  ])('%s uses its existing destination', (id, url) => {
    renderLayout();
    fireEvent.click(navButton(id));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(url);
  });

  it.each([undefined, null, ''])('profile falls back to user ID for slug %s', (slug) => {
    mockUser = { id: 105, slug };
    renderLayout();
    fireEvent.click(navButton('profile'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/105');
  });

  it('profile falls back to dashboard without a user', () => {
    mockUser = null;
    renderLayout();
    fireEvent.click(navButton('profile'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it.each(['search', 'unknown-module'])('the parent guard does not route %s', (id) => {
    renderLayout();
    act(() => mockSidebarProps.onItemClick(id));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('logs out through the existing utility menu, then routes home', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: 'Viac' }));
    await user.click(screen.getByRole('button', { name: 'Odhlásiť sa' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockLogout.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
  });

  it('opens a search result user by slug', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Otvoriť používateľa' }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/result-user');
  });

  it('opens a search result user without a slug by ID', () => {
    renderLayout();
    act(() => mockSearchProps.onUserClick?.(21));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/21');
  });

  it('opens the selected card with its existing highlight parameter', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Otvoriť kartu' }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/result-user?highlight=63');
  });
});

describe('SearchLayout: preserve search overlay lifecycle', () => {
  it('search toggles the panel without routing or changing browser history', async () => {
    const user = userEvent.setup();
    const { panel } = renderLayout();
    const location = window.location.href;
    const historyLength = window.history.length;
    await user.click(navButton('search').querySelector('span')!);
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('search-child')).toHaveAttribute('data-active', 'false');
    await user.click(navButton('search'));
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByTestId('search-child')).toHaveAttribute('data-active', 'true');
    expect(window.location.href).toBe(location);
    expect(window.history.length).toBe(historyLength);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('mousedown inside the search panel leaves it open', () => {
    const { panel } = renderLayout();
    fireEvent.mouseDown(screen.getByRole('textbox', { name: 'Vyhľadávací dopyt' }));
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  it('mousedown on the main results closes the panel without navigation', () => {
    const { panel } = renderLayout();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Výsledky stránky' }));
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('mousedown in sidebar outside search closes the panel', () => {
    const { panel } = renderLayout();
    fireEvent.mouseDown(navButton('watches'));
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('an open filter modal protects the panel from outside mousedown', () => {
    const { panel } = renderLayout();
    document.body.classList.add('filter-modal-open');
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Výsledky stránky' }));
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  it('Escape closes the panel and is consumed; unrelated keys leave it open', () => {
    const { panel } = renderLayout();
    expect(fireEvent.keyDown(document.body, { key: 'ArrowDown' })).toBe(true);
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(false);
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Escape inside a dialog does not close the parent panel', () => {
    const { panel } = renderLayout();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    try {
      expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(true);
      expect(panel).toHaveAttribute('aria-hidden', 'false');
    } finally {
      dialog.remove();
    }
  });

  it('Escape outside a dialog is ignored while a filter modal is open', () => {
    const { panel } = renderLayout();
    document.body.classList.add('filter-modal-open');
    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true);
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  it('unmount removes the exact document handlers registered by the layout', () => {
    const add = jest.spyOn(document, 'addEventListener');
    const remove = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderLayout();
    const listeners = add.mock.calls.filter(([type]) => type === 'mousedown' || type === 'keydown');
    expect(listeners).toHaveLength(2);
    unmount();
    for (const [type, handler] of listeners) {
      expect(remove).toHaveBeenCalledWith(type, handler);
    }
    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
