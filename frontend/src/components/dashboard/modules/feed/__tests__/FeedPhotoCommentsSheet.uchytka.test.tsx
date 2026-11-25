/**
 * Úchytka panela komentárov nad fotkou (nález 343, R55).
 *
 * Má byť tenká úchytka 40×6 px. Globálne `button { min-height: 36px }` z `globals.css` ju dnes natiahne na sivý ovál
 * 40×36 px a odtlačí nadpis „Komentáre“ nižšie, preto má `min-h-0`. Dotykovú plochu (asi 96×44 px) dáva neviditeľný prvok
 * `after`, ktorý začína na okraji panela a siaha pod úchytku, takže sa panel dá zavrieť ťukom aj potiahnutím nadol.
 *
 * jsdom nelayoutuje ani nepozná štýly z `globals.css`, takže sa kontrolujú triedy; skutočné rozmery (úchytka 40×6 px,
 * dotyková plocha 96×44 px) sa merali v Chromiu.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPhotoCommentsSheet from '../FeedPhotoCommentsSheet';

jest.mock('../FeedPostComments', () => ({
  __esModule: true,
  default: () => <div data-testid="komentare-zoznam" />,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

function vykresli(onClose = jest.fn(), open = true) {
  render(
    <FeedPhotoCommentsSheet
      postId={5}
      open={open}
      onClose={onClose}
      onCountChange={jest.fn()}
      onTotalChange={jest.fn()}
    />,
  );
  return onClose;
}

describe('úchytka panela komentárov nad fotkou', () => {
  it('je tenká úchytka 40×6 px a globálna výška tlačidla ju nenatiahne (`min-h-0`)', () => {
    vykresli();

    const uchytka = screen.getByTestId('feed-photo-comments-handle');
    expect(uchytka).toHaveClass('h-1.5', 'w-10', 'min-h-0', 'rounded-full');
    expect(uchytka).toHaveClass('mx-auto', 'block');
  });

  it('má neviditeľnú dotykovú plochu 96×44 px, ktorá začína na okraji panela', () => {
    vykresli();

    const uchytka = screen.getByTestId('feed-photo-comments-handle');
    expect(uchytka).toHaveClass('relative');
    expect(uchytka).toHaveClass(
      'after:absolute',
      'after:-top-2',
      'after:left-1/2',
      'after:h-11',
      'after:w-24',
      'after:-translate-x-1/2',
    );
    expect(uchytka.className).toContain("after:content-['']");
  });

  it('je jemná, svetlá a pri hoveri zvýraznená', () => {
    vykresli();

    expect(screen.getByTestId('feed-photo-comments-handle')).toHaveClass('bg-white/35', 'hover:bg-white/55');
  });

  it('ťuk na úchytku zavrie panel', async () => {
    const onClose = vykresli();

    await userEvent.click(screen.getByTestId('feed-photo-comments-handle'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('má prístupný názov „Zavrieť komentáre“', () => {
    vykresli();

    expect(screen.getByTestId('feed-photo-comments-handle')).toHaveAccessibleName('Zavrieť komentáre');
  });

  it('nadpis „Komentáre“ je hneď pod úchytkou v tej istej ťahateľnej hlavičke', () => {
    vykresli();

    const hlavicka = screen.getByTestId('feed-photo-comments-drag');
    expect(hlavicka).toContainElement(screen.getByTestId('feed-photo-comments-handle'));
    expect(hlavicka).toContainElement(screen.getByRole('heading', { name: 'Komentáre' }));
    expect(hlavicka).toHaveClass('pt-2', 'pb-1');
  });

  it('potiahnutie hlavičky nadol o aspoň 90 px zavrie panel, kratšie ho nechá otvorený', () => {
    const onClose = vykresli();
    const hlavicka = screen.getByTestId('feed-photo-comments-drag');

    fireEvent.touchStart(hlavicka, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(hlavicka, { touches: [{ clientY: 150 }] });
    fireEvent.touchEnd(hlavicka);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.touchStart(hlavicka, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(hlavicka, { touches: [{ clientY: 200 }] });
    fireEvent.touchEnd(hlavicka);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('zatvorený panel sa nevykreslí', () => {
    vykresli(jest.fn(), false);

    expect(screen.queryByTestId('feed-photo-comments-handle')).toBeNull();
  });
});
