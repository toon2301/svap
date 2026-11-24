/**
 * Text príspevku (`FeedPostCaption`): vlastnosť `fillParent` (K58, krok 2, nález 366).
 *
 * V ľavom stĺpci dvojstĺpcového okna je text nad kartou ponuky, portfólia a reposta s fotkou pružný: rozbalený text
 * nemá pevný strop, vyplní miesto, ktoré mu rodič (flex stĺpec) ponechá, a posúva sa vo vlastnom rámčeku, takže sa
 * karta nikdy neposúva. Podlaha je asi päť riadkov a prepínač (`min-h-[8.6rem]`).
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`) a
 * kontrolujú sa triedy, ktoré o rozložení rozhodujú; výšky v pixeloch ukazuje prehliadač.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCaption, { type CaptionExpansionBound } from '../FeedPostCaption';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

const DLHY_TEXT = 'Veľmi dlhý text príspevku, ktorý presahuje päť riadkov.';

/** Zbalený odsek presahuje, rozbalený sa zmestí. */
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

/** Koreň komponentu: obal, ktorý nesie odsek aj prepínač. */
function koren(): HTMLElement {
  return screen.getByTestId('feed-post-caption').parentElement as HTMLElement;
}

async function rozbal() {
  await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
}

describe('rozbalený text s fillParent', () => {
  it('vyplní zvyšok rodiča: `min-h-0 flex-1`, vlastné posúvanie a prstenec fokusu', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent maxLines={5} />);

    await rozbal();

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'subtle-scrollbar');
    expect(odsek).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-purple-400/60');
    expect(odsek).not.toHaveClass('line-clamp-5');
    expect(odsek).toHaveAttribute('role', 'region');
    expect(odsek).toHaveAttribute('tabindex', '0');
  });

  it.each<CaptionExpansionBound>(['compact', 'roomy', 'viewer'])(
    'pevný strop „%s“ sa ignoruje, žiadne `max-h-`',
    async (strop) => {
      nastavVysky();
      render(
        <FeedPostCaption text={DLHY_TEXT} boundedExpansion expansionBound={strop} fillParent />,
      );

      await rozbal();

      expect(screen.getByTestId('feed-post-caption').className).not.toMatch(/max-h-/);
    },
  );

  it('koreň je po rozbalení flex stĺpec s podlahou asi päť riadkov a prepínač', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent />);

    await rozbal();

    expect(koren()).toHaveClass('flex', 'flex-col', 'min-h-[8.6rem]');
  });

  it('prepínač „Menej“ nemá byť natiahnutý ako tlačidlo vo flex stĺpci: `shrink-0 self-start`', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent />);

    await rozbal();

    const prepinac = screen.getByTestId('feed-post-caption-toggle');
    expect(prepinac).toHaveTextContent('Menej');
    expect(prepinac).toHaveClass('shrink-0', 'self-start');
    expect(prepinac.className).not.toMatch(/\s{2,}/);
  });

  it('po zbalení sa podlaha aj posúvanie vrátia', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent />);

    await rozbal();
    await userEvent.click(screen.getByTestId('feed-post-caption-toggle'));

    expect(koren()).not.toHaveClass('min-h-[8.6rem]');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('min-h-0');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('overflow-y-auto');
  });

  it('bez boundedExpansion sa rozbalený text nenatiahne ani neposúva', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} fillParent />);

    await rozbal();

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).not.toHaveClass('min-h-0');
    expect(odsek).not.toHaveClass('flex-1');
    expect(odsek).not.toHaveClass('overflow-y-auto');
  });

  it('s tónom na fotke má koreň flex aj tmavý obal', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent tone="onPhoto" />);

    await rozbal();

    expect(koren()).toHaveClass(
      'flex',
      'flex-col',
      'min-h-[8.6rem]',
      '-mx-2',
      'rounded-xl',
      'bg-black/60',
      'backdrop-blur-sm',
    );
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveClass(
      'shrink-0',
      'self-start',
      'text-white/80',
    );
  });
});

describe('zbalený text s fillParent', () => {
  it('má orezanie na riadky a koreň je flex stĺpec bez podlahy', () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent maxLines={5} />);

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-5');
    expect(koren()).toHaveClass('flex', 'flex-col');
    expect(koren().className).not.toContain('min-h-');
  });

  it('prepínač „Viac“ je tiež `shrink-0 self-start`', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent />);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    expect(prepinac).toHaveTextContent('Viac');
    expect(prepinac).toHaveClass('shrink-0', 'self-start');
  });
});

describe('text bez fillParent ostáva ako doteraz', () => {
  it('rozbalený text má pevný strop a koreň nemá žiadne triedy', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion />);

    await rozbal();

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass('max-h-[max(25vh,14rem)]', 'overflow-y-auto');
    expect(odsek).not.toHaveClass('min-h-0');
    expect(odsek).not.toHaveClass('flex-1');
    expect(koren()).not.toHaveAttribute('class');
  });

  it('prepínač nemá `shrink-0` ani `self-start`', async () => {
    nastavVysky();
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion />);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    expect(prepinac).not.toHaveClass('shrink-0');
    expect(prepinac).not.toHaveClass('self-start');
    expect(prepinac.className).not.toMatch(/\s{2,}/);
  });

  it('výslovné `fillParent={false}` je to isté ako vynechanie', async () => {
    nastavVysky();
    const { rerender } = render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion />);
    await rozbal();
    const bezVlastnosti = screen.getByTestId('feed-post-caption').className;

    rerender(<FeedPostCaption text={DLHY_TEXT} boundedExpansion fillParent={false} />);

    expect(screen.getByTestId('feed-post-caption').className).toBe(bezVlastnosti);
    expect(koren()).not.toHaveAttribute('class');
  });
});
