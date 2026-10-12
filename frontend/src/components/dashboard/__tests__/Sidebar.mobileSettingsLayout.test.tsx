import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

jest.mock('../contexts/RequestsNotificationsContext', () => ({
  __esModule: true,
  useRequestsNotifications: () => ({
    unreadCount: 0,
    refreshUnreadCount: jest.fn(),
    markAllRead: jest.fn(),
  }),
  useMessagesNotifications: () => ({
    unreadCount: 0,
    refreshUnreadCount: jest.fn(),
    setActiveConversationId: jest.fn(),
    syncConversationReadState: jest.fn(),
  }),
  useNotificationsUnread: () => ({
    unreadCount: 0,
    refreshUnreadCount: jest.fn(),
    markAllRead: jest.fn(),
  }),
}));

/**
 * Mobilné Nastavenia: hlavička hore, posúvaný zoznam uprostred a „Viac" pevne dole.
 *
 * Layout sa v jsdom nedá zmerať, preto sa pinuje stavba: kto je v posúvanom zozname,
 * kto je mimo neho a ktoré triedy zaručujú, že sa zoznam zmenšuje a spodok nie.
 */

const ROWS = ['Upozornenia', 'Sledovanie', 'Typ účtu', 'Súkromie', 'Jazyk', 'Blokované', 'Účet'];

function renderMobileSettings() {
  return render(
    <ThemeProvider>
      <Sidebar activeItem="settings" onItemClick={jest.fn()} onLogout={jest.fn()} isMobile isOpen onClose={jest.fn()} />
    </ThemeProvider>,
  );
}

const list = () => document.querySelector<HTMLElement>('[data-mobile-settings-list]');
const footer = () => document.querySelector<HTMLElement>('[data-mobile-settings-footer]');
const wrapper = () => document.querySelector<HTMLElement>('[data-mobile-settings-scroll]');

describe('Sidebar – mobilné Nastavenia: pevné „Viac"', () => {
  it('všetky riadky nastavení sú v posúvanom zozname', () => {
    renderMobileSettings();

    const scrollingList = list();
    expect(scrollingList).not.toBeNull();
    ROWS.forEach((label) => {
      expect(within(scrollingList!).getByText(label)).toBeInTheDocument();
    });
  });

  it('„Viac" nie je v posúvanom zozname, ale v pevnom spodku', () => {
    renderMobileSettings();

    const viac = screen.getByRole('button', { name: 'Viac' });
    expect(list()).not.toBeNull();
    expect(list()!.contains(viac)).toBe(false);
    expect(footer()).not.toBeNull();
    expect(footer()!.contains(viac)).toBe(true);
  });

  it('zoznam sa posúva a zmenšuje, pevný spodok sa nezmenšuje', () => {
    renderMobileSettings();

    expect(wrapper()).toHaveClass('flex-1', 'min-h-0', 'flex', 'flex-col');
    expect(list()).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto');
    expect(footer()).toHaveClass('shrink-0');
  });

  it('zoznam aj spodok majú spoločný obal s pôvodnou značkou `data-mobile-settings-scroll`', () => {
    renderMobileSettings();

    expect(wrapper()).not.toBeNull();
    expect(wrapper()!.contains(list())).toBe(true);
    expect(wrapper()!.contains(footer())).toBe(true);
    expect(within(wrapper()!).getByRole('button', { name: 'Viac' })).toBeInTheDocument();
  });

  it('spodok je pod zoznamom a drží odstup od spodnej lišty prehliadača', () => {
    renderMobileSettings();

    const children = Array.from(wrapper()!.children);
    expect(children.indexOf(footer()!)).toBeGreaterThan(children.indexOf(list()!));
    expect(footer()!.className).toContain('pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+5rem))]');
  });

  it('„Viac" po kliknutí otvorí ponuku s odhlásením', () => {
    renderMobileSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));

    const dialog = screen.getByRole('dialog', { name: 'Viac' });
    expect(within(dialog).getByRole('button', { name: 'Odhlásiť sa' })).toBeInTheDocument();
  });

  it('na desktope sa mobilný obal nevykreslí', () => {
    render(
      <ThemeProvider>
        <Sidebar activeItem="home" onItemClick={jest.fn()} onLogout={jest.fn()} />
      </ThemeProvider>,
    );

    expect(wrapper()).toBeNull();
    expect(list()).toBeNull();
    expect(footer()).toBeNull();
    expect(screen.getByRole('button', { name: 'Viac' })).toBeInTheDocument();
  });
});
