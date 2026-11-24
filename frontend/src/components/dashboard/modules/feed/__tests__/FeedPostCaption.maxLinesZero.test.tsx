/**
 * Text bez orezania (`maxLines={0}`): rozbalený stav a prepínač sa v tomto režime ignorujú (PR #326, nález CodeRabbitu ku K58).
 *
 * `0` znamená „ukáž celý text“ (okno príspevku len s textom, R73), takže nie je čo rozbaľovať ani prepínať. Komponent drží
 * stav „rozbalené“ a „presahuje“ sám; ak sa ten istý text prepne z orezaného na neorezaný (napríklad pri zmene rozloženia
 * okna), nesmie ostať v rámiku s prepínačom „Menej“. Pri návrate k obmedzenému počtu riadkov sa text vráti zbalený a
 * meranie presahu prebehne znova, aby prepínač zodpovedal aktuálnemu textu. `FeedPostCardCaption` to dnes rieši ešte aj
 * kľúčom; `FeedPostSharedBlock` a `SharedContentPreviewCard` ho nemajú, preto to musí vedieť samotný komponent.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCaption from '../FeedPostCaption';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

const TEXT = 'Dlhý text príspevku, ktorý presahuje tri aj desať riadkov.';

/**
 * `lenOrezany`: odsek presahuje, kým je orezaný (ako v prehliadači), neorezaný sa zmestí.
 * `vzdy`: odsek presahuje vždy, aj bez orezania (stráži, že v režime bez orezania sa prepínač neukáže ani vtedy).
 */
function nastavVysky(rezim: 'lenOrezany' | 'vzdy') {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-post-caption' ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-post-caption') return 0;
      if (rezim === 'vzdy') return 900;
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype: bez upratania by pretiekli do ďalšieho testu.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

type Vlastnosti = {
  maxLines: number;
  tone?: 'default' | 'onPhoto';
  fillParent?: boolean;
};

function caption({ maxLines, tone, fillParent }: Vlastnosti) {
  return (
    <FeedPostCaption
      text={TEXT}
      boundedExpansion
      expansionBound="roomy"
      maxLines={maxLines}
      tone={tone}
      fillParent={fillParent}
    />
  );
}

describe('text bez orezania (`maxLines={0}`)', () => {
  it('je celý: bez orezania a bez „Viac“, aj keď by odsek presahoval', () => {
    nastavVysky('vzdy');
    render(caption({ maxLines: 0 }));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toContain('line-clamp');
    expect(odsek).toHaveTextContent(TEXT);
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('rozbalený text po prechode na `maxLines={0}` nemá rámik, posúvanie ani „Menej“', async () => {
    nastavVysky('lenOrezany');
    const { rerender } = render(caption({ maxLines: 10 }));
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');

    rerender(caption({ maxLines: 0 }));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toMatch(/max-h-/);
    expect(odsek.className).not.toContain('line-clamp');
    expect(odsek).not.toHaveClass('overflow-y-auto');
    expect(odsek).not.toHaveAttribute('role');
    expect(odsek).not.toHaveAttribute('tabindex');
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('po návrate k obmedzeniu je text zase zbalený a „Viac“ sa objaví', async () => {
    nastavVysky('lenOrezany');
    const { rerender } = render(caption({ maxLines: 10 }));
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    rerender(caption({ maxLines: 0 }));

    rerender(caption({ maxLines: 10 }));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass('line-clamp-[10]');
    expect(odsek.className).not.toMatch(/max-h-/);
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('po návrate k obmedzeniu sa presah zmeria znova, aj keď text nikdy nebol rozbalený', async () => {
    nastavVysky('lenOrezany');
    const { rerender } = render(caption({ maxLines: 0 }));
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();

    rerender(caption({ maxLines: 3 }));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('rozbalený text na fotke a pružný text po prechode na `maxLines={0}` nemajú tmavý obal ani podlahu', async () => {
    nastavVysky('lenOrezany');
    const { rerender, container } = render(
      caption({ maxLines: 10, tone: 'onPhoto', fillParent: true }),
    );
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    const koren = container.firstElementChild as HTMLElement;
    expect(koren).toHaveClass('-mx-2', 'bg-black/60', 'min-h-[8.6rem]');

    rerender(caption({ maxLines: 0, tone: 'onPhoto', fillParent: true }));

    expect(koren).not.toHaveClass('-mx-2');
    expect(koren).not.toHaveClass('bg-black/60');
    expect(koren).not.toHaveClass('min-h-[8.6rem]');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('flex-1');
  });
});

describe('obmedzený text sa správa ako doteraz', () => {
  it('10 riadkov: „Viac“ rozbalí do rámika a „Menej“ ho zbalí', async () => {
    nastavVysky('lenOrezany');
    render(caption({ maxLines: 10 }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]', 'overflow-y-auto');

    await userEvent.click(screen.getByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('prechod medzi 3 a 10 riadkami nechá rozbalený text rozbalený', async () => {
    nastavVysky('lenOrezany');
    const { rerender } = render(caption({ maxLines: 3 }));
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    rerender(caption({ maxLines: 10 }));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');
  });
});
