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

/**
 * Pod lištou „Viac" nie je žiadny pevný odstup: Safari 26 na iPhone ukončuje rozloženie stránky nad svojou
 * plávajúcou lištou (na jeho fotke 754 px z 852), takže lišta má sedieť úplne dole. Bezpečná oblasť dole sa
 * pridáva len v nainštalovanej appke (PWA), kde nie je žiadna lišta prehliadača.
 */
const FOOTER_STANDALONE_PADDING = '[@media(display-mode:standalone)]:pb-[env(safe-area-inset-bottom,0px)]';

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

  it('spodok je pod zoznamom', () => {
    renderMobileSettings();

    const children = Array.from(wrapper()!.children);
    expect(children.indexOf(footer()!)).toBeGreaterThan(children.indexOf(list()!));
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

/**
 * Nízke okno (na šírku, rozdelená obrazovka, priblíženie): hlavička a pevná lišta s „Viac" majú po 69 px,
 * takže na okne na šírku ostáva zoznamu len ~2-3 riadky a pri veľmi nízkom okne by sa zmenšil až na nulu
 * (pri pôvodnom 205 px spodku sa to stalo pod ~274 px výšky a riadky sa nedali dosiahnuť).
 * Pod výškou okna 28 rem sa preto zoznam prestane posúvať sám a posúva sa celý obal so spodkom na
 * konci, ako pred pevným spodkom. Media query sa v jsdom nevyhodnotí, preto sa pinujú triedy;
 * skutočné správanie meria beh v prehliadači.
 */
const SHORT_VIEWPORT = '[@media(max-height:28rem)]';

/** Hranice výšky okna (`[@media(max-height:...)]`), ktoré prvok používa vo svojich triedach. */
const heightQueries = (element: HTMLElement) =>
  Array.from(element.classList)
    .filter((className) => className.startsWith('[@media(max-height:'))
    .map((className) => className.slice(0, className.indexOf(']:') + 1));

describe('Sidebar – mobilné Nastavenia: nízke okno', () => {
  it('pod výškou okna 28 rem sa posúva celý obal so zoznamom aj spodkom', () => {
    renderMobileSettings();

    expect(wrapper()).toHaveClass(`${SHORT_VIEWPORT}:overflow-y-auto`, 'overscroll-contain', 'elegant-scrollbar');
  });

  it('pod výškou okna 28 rem sa zoznam prestane posúvať sám a zmenšovať', () => {
    renderMobileSettings();

    expect(list()).toHaveClass(`${SHORT_VIEWPORT}:flex-none`, `${SHORT_VIEWPORT}:overflow-visible`);
  });

  it('obal aj zoznam používajú tú istú hranicu výšky okna', () => {
    renderMobileSettings();

    expect(new Set([...heightQueries(wrapper()!), ...heightQueries(list()!)])).toEqual(new Set([SHORT_VIEWPORT]));
  });

  it('pevný spodok sa na nízkom okne nemení', () => {
    renderMobileSettings();

    expect(heightQueries(footer()!)).toEqual([]);
    expect(footer()).toHaveClass('shrink-0');
  });
});

/**
 * Spodná lišta s „Viac" má byť tenká ako hlavička hore (1 px rámik + 12 + 44 + 12 = 69 px, hlavička
 * 16 + 36 + 16 + 1 = 69 px) a sedieť úplne dole: nie 93 px blok so 112 px prázdneho miesta pod ním ani
 * 88 px odstup (Safari 26 ukončuje rozloženie nad svojou lištou, takže odstup lištu len zdvíhal).
 * Rozmery sa v jsdom nedajú zmerať, preto sa pinujú triedy; skutočné čísla meria beh v prehliadači.
 */
describe('Sidebar – mobilné Nastavenia: tenká spodná lišta', () => {
  it('lišta s „Viac" má rámik hore a úzke zvislé odsadenie (nie p-6)', () => {
    renderMobileSettings();

    const bar = footer()!.firstElementChild as HTMLElement;
    expect(bar).toHaveClass('border-t', 'px-6', 'py-3');
    expect(bar).not.toHaveClass('p-6');
    expect(within(bar).getByRole('button', { name: 'Viac' })).toBeInTheDocument();
  });

  it('lišta sedí úplne dole: žiadny pevný odstup, bezpečná oblasť len v nainštalovanej appke', () => {
    renderMobileSettings();

    expect(footer()).toHaveClass('shrink-0', FOOTER_STANDALONE_PADDING);
    expect(footer()!.className).not.toMatch(/(^|\s)pb-/);
    expect(footer()!.className).not.toMatch(/\d(\.\d+)?rem/);
  });
});
