/**
 * Text voľného príspevku v karte (`FeedPostCardCaption`): K58, krok 3.
 *
 * Mimo okna príspevku len s textom je obal `px-4 py-3` s pevným blokom (`fixedBlock`) a text sa správa ako doteraz (3
 * riadky v karte, 10 v okne detailu, rozbalený strop podľa `fillHeight`). V ľavom stĺpci okna príspevku len s textom
 * (R73) nie je čo iné ukázať, takže je obal pružný, text sa ukáže celý bez „Viac“ a posúva sa len on.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCardCaption from '../FeedPostCardCaption';
import { FeedDetailTextOnlyProvider } from '../FeedDetailTextOnlyContext';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

const TEXT = 'Dlhý text príspevku, ktorý presahuje desať riadkov.';

/** Text vždy presahuje, kým je orezaný; rozbalený sa zmestí. */
function nastavVysky() {
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
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

type Vlastnosti = {
  isDetail?: boolean;
  fillHeight?: boolean;
  fixedBlock?: string;
  onTextClick?: () => void;
  caption?: string;
};

function vykresli({
  isDetail = false,
  fillHeight = false,
  fixedBlock = '',
  onTextClick,
  caption = TEXT,
}: Vlastnosti = {}) {
  return (
    <FeedPostCardCaption
      caption={caption}
      isDetail={isDetail}
      fillHeight={fillHeight}
      fixedBlock={fixedBlock}
      onTextClick={onTextClick}
    />
  );
}

/** Obal textu: rodič odseku je koreň `FeedPostCaption`, jeho rodič je obal karty. */
function obal(): HTMLElement {
  return screen.getByTestId('feed-post-caption').parentElement?.parentElement as HTMLElement;
}

describe('text mimo okna príspevku len s textom', () => {
  it('obal má `px-4 py-3` a pevný blok z vlastnosti', () => {
    render(vykresli({ fillHeight: true, fixedBlock: 'shrink-0' }));

    expect(obal()).toHaveClass('px-4', 'py-3', 'shrink-0');
    expect(obal()).not.toHaveClass('flex-1');
    expect(obal()).not.toHaveClass('overflow-y-auto');
  });

  it('bez pevného bloku má obal len `px-4 py-3`', () => {
    render(vykresli({ fixedBlock: '' }));

    expect(obal().className.trim()).toBe('px-4 py-3');
  });

  it('karta vo feede má 3 riadky a rozbalený text bez stropu', async () => {
    nastavVysky();
    render(vykresli({ isDetail: false }));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toMatch(/max-h-/);
    expect(odsek).not.toHaveClass('overflow-y-auto');
  });

  it('okno detailu má 10 riadkov a „Viac“', async () => {
    nastavVysky();
    render(vykresli({ isDetail: true }));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it.each<[string, boolean, string]>([
    ['jednostĺpcové okno (compact)', false, 'max-h-[max(25vh,14rem)]'],
    ['dvojstĺpcové okno (roomy)', true, 'max-h-[40vh]'],
  ])('rozbalený text: %s má strop %s', async (_nazov, fillHeight, strop) => {
    nastavVysky();
    render(vykresli({ isDetail: true, fillHeight }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass(strop, 'overflow-y-auto', 'subtle-scrollbar');
    expect(odsek).toHaveAttribute('role', 'region');
  });

  it('ťuk na text volá onTextClick a odsek je ťukateľný', async () => {
    const priTuku = jest.fn();
    render(vykresli({ onTextClick: priTuku }));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('cursor-pointer');
    await userEvent.click(screen.getByTestId('feed-post-caption'));

    expect(priTuku).toHaveBeenCalledTimes(1);
  });

  it('bez onTextClick text nie je ťukateľný', () => {
    render(vykresli());

    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('cursor-pointer');
  });

  it('zhluk prázdnych riadkov sa scvrkne na jedno zalomenie', () => {
    render(vykresli({ caption: 'Prvý odsek\n\n\n\n\nDruhý odsek' }));

    expect(screen.getByTestId('feed-post-caption').textContent).toBe('Prvý odsek\nDruhý odsek');
  });
});

describe('text v okne príspevku len s textom', () => {
  function vOkneLenSTextom(vlastnosti: Vlastnosti = {}) {
    return (
      <FeedDetailTextOnlyProvider value>
        {vykresli({ isDetail: true, fillHeight: true, fixedBlock: 'shrink-0', ...vlastnosti })}
      </FeedDetailTextOnlyProvider>
    );
  }

  it('obal je pružný a posúva sa len on, pevný blok sa nepoužije', () => {
    render(vOkneLenSTextom());

    expect(obal()).toHaveClass(
      'px-4',
      'py-3',
      'subtle-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    );
    expect(obal()).not.toHaveClass('shrink-0');
  });

  it('text sa ukáže celý: bez orezania a bez „Viac“, aj keď by presahoval', () => {
    nastavVysky();
    render(vOkneLenSTextom());

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toContain('line-clamp');
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
    expect(odsek).toHaveTextContent(TEXT);
  });

  it('odsek nemá vlastný strop ani posúvanie, posúva sa obal', () => {
    render(vOkneLenSTextom());

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toMatch(/max-h-/);
    expect(odsek).not.toHaveClass('overflow-y-auto');
    expect(odsek).not.toHaveAttribute('role');
  });

  it('karta mimo okna (isDetail false) má v poskytovateli stále 3 riadky', () => {
    nastavVysky();
    render(
      <FeedDetailTextOnlyProvider value>
        {vykresli({ isDetail: false })}
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
  });

  it('ťuk na text volá onTextClick aj v okne len s textom', async () => {
    const priTuku = jest.fn();
    render(vOkneLenSTextom({ onTextClick: priTuku }));

    await userEvent.click(screen.getByTestId('feed-post-caption'));

    expect(priTuku).toHaveBeenCalledTimes(1);
  });

  it('pri prechode do okna len s textom sa rozbalený text vráti na celý a bez „Menej“', async () => {
    nastavVysky();
    const { rerender } = render(
      <FeedDetailTextOnlyProvider value={false}>
        {vykresli({ isDetail: true, fillHeight: true, fixedBlock: 'shrink-0' })}
      </FeedDetailTextOnlyProvider>,
    );
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');

    // Zamietnutie poslednej fotky počas otvoreného okna: karta ostáva pripojená, stav „rozbalené“ by prežil.
    rerender(vOkneLenSTextom());

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toMatch(/max-h-/);
    expect(odsek.className).not.toContain('line-clamp');
    expect(odsek).not.toHaveAttribute('role');
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('pri odchode z okna len s textom sa text zase orezáva na desať riadkov', async () => {
    nastavVysky();
    const { rerender } = render(vOkneLenSTextom());
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();

    rerender(
      <FeedDetailTextOnlyProvider value={false}>
        {vykresli({ isDetail: true, fillHeight: true, fixedBlock: 'shrink-0' })}
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
    expect(obal()).toHaveClass('shrink-0');
  });
});
