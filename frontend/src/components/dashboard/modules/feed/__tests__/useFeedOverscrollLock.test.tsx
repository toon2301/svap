/**
 * Poistka proti „hýbaniu“ stránky pod mobilným detailom a panelom komentárov (R75 bod 5, nález 370).
 *
 * Kým je vrstva otvorená, `html` aj `body` dostanú `overscroll-behavior: none` (gumový efekt a reťazenie scrollu sa vypnú) a
 * pri zatvorení sa vrátia pôvodné hodnoty. Zámok sa počíta: viac vrstiev naraz ho drží spolu a hodnoty sa vrátia, až keď sa
 * zatvorí posledná, v ľubovoľnom poradí. `overflow` na `body` sa zámerne nemení.
 */

import { render } from '@testing-library/react';
import {
  lockFeedOverscroll,
  useFeedOverscrollLock,
} from '../useFeedOverscrollLock';

function Vrstva({ active }: { active: boolean }) {
  useFeedOverscrollLock(active);
  return null;
}

const html = () => document.documentElement.style.overscrollBehavior;
const body = () => document.body.style.overscrollBehavior;

beforeEach(() => {
  document.documentElement.style.overscrollBehavior = '';
  document.body.style.overscrollBehavior = '';
  document.body.style.overflow = '';
});

describe('hook', () => {
  it('kým je aktívny, vypne gumový efekt na html aj body a po vypnutí vráti pôvodnú hodnotu', () => {
    const { rerender } = render(<Vrstva active />);
    expect(html()).toBe('none');
    expect(body()).toBe('none');

    rerender(<Vrstva active={false} />);
    expect(html()).toBe('');
    expect(body()).toBe('');
  });

  it('neaktívny nič nemení', () => {
    render(<Vrstva active={false} />);

    expect(html()).toBe('');
    expect(body()).toBe('');
  });

  it('odmontovanie vráti hodnoty', () => {
    const { unmount } = render(<Vrstva active />);

    unmount();

    expect(html()).toBe('');
    expect(body()).toBe('');
  });

  it('nemení `overflow` na body (iné vrstvy si ho spravujú samy)', () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(<Vrstva active />);
    expect(document.body.style.overflow).toBe('auto');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});

describe('počítaný zámok', () => {
  it('pôvodné hodnoty, ktoré už stránka mala, sa po uvoľnení vrátia', () => {
    document.documentElement.style.overscrollBehavior = 'contain';
    document.body.style.overscrollBehavior = 'auto';

    const uvolni = lockFeedOverscroll();
    expect(html()).toBe('none');

    uvolni();
    expect(html()).toBe('contain');
    expect(body()).toBe('auto');
  });

  it('dve vrstvy naraz držia zámok spolu, hodnoty sa vrátia až po poslednej (obe poradia)', () => {
    const prva = lockFeedOverscroll();
    const druha = lockFeedOverscroll();
    prva();
    expect(html()).toBe('none');
    druha();
    expect(html()).toBe('');

    const tretia = lockFeedOverscroll();
    const stvrta = lockFeedOverscroll();
    stvrta();
    expect(body()).toBe('none');
    tretia();
    expect(body()).toBe('');
  });

  it('opakované uvoľnenie tej istej vrstvy nepokazí zámok druhej', () => {
    const prva = lockFeedOverscroll();
    const druha = lockFeedOverscroll();

    prva();
    prva();
    expect(html()).toBe('none');

    druha();
    expect(html()).toBe('');
  });
});
