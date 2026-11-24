/**
 * Text príspevku (`FeedPostCaption`): tón textu na fotke, obal odseku a stropy rozbaleného textu (K58, krok 1, nálezy
 * 357, 364 a 365).
 *
 * Komponent sa tu kreslí priamo, bez karty. jsdom nelayoutuje, takže „presahuje text riadky?" sa nastavuje na uzle
 * (`scrollHeight` proti `clientHeight`), presne tie dve hodnoty, ktoré komponent v prehliadači porovnáva.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCaption, {
  BOUNDED_EXPANDED_MAX_HEIGHT,
  type CaptionExpansionBound,
} from '../FeedPostCaption';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

const DLHY_TEXT = 'Veľmi dlhý text príspevku, ktorý presahuje tri riadky.';

/**
 * Zbalený odsek presahuje (`scrollHeight` je väčší než `clientHeight`), rozbalený sa zmestí. Bez `presahuje` sa zmestí
 * aj zbalený.
 */
function nastavVysky({ presahuje }: { presahuje: boolean }) {
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
      return presahuje && this.className.includes('line-clamp') ? 900 : 60;
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
  return screen.getByTestId('feed-post-caption').closest('div') as HTMLElement;
}

describe('tón textu', () => {
  it('na fotke je odsek biely a bez sivých tried', () => {
    render(<FeedPostCaption text={DLHY_TEXT} tone="onPhoto" />);

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass('text-white');
    expect(odsek).not.toHaveClass('text-gray-800');
    expect(odsek).not.toHaveClass('dark:text-gray-100');
  });

  it('predvolený tón nechá odsek sivý, ako doteraz', () => {
    render(<FeedPostCaption text={DLHY_TEXT} />);

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass('text-gray-800', 'dark:text-gray-100');
    expect(odsek).not.toHaveClass('text-white');
  });

  it('výslovné `default` vyzerá rovnako ako vynechaný tón', () => {
    const { rerender } = render(<FeedPostCaption text={DLHY_TEXT} />);
    const bezTonu = screen.getByTestId('feed-post-caption').className;

    rerender(<FeedPostCaption text={DLHY_TEXT} tone="default" />);

    expect(screen.getByTestId('feed-post-caption').className).toBe(bezTonu);
  });

  it('zbalený text na fotke nemá tmavý obal, sedí priamo na gradiente', () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} tone="onPhoto" />);

    expect(koren()).not.toHaveAttribute('class');
  });

  it('rozbalený text na fotke dostane tmavý obal so zjemneným pozadím', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} tone="onPhoto" />);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    expect(koren()).toHaveClass(
      '-mx-2',
      'rounded-xl',
      'bg-black/60',
      'px-2',
      'py-1.5',
      'backdrop-blur-sm',
    );
  });

  it('po zbalení tmavý obal zase zmizne', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} tone="onPhoto" />);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    await userEvent.click(screen.getByTestId('feed-post-caption-toggle'));

    expect(koren()).not.toHaveAttribute('class');
  });

  it('rozbalený text v predvolenom tóne tmavý obal nemá', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} />);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    expect(koren()).not.toHaveAttribute('class');
    expect(koren().innerHTML).not.toContain('bg-black/60');
  });

  it('prepínač na fotke je biely s bielym prstencom fokusu', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} tone="onPhoto" />);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    expect(prepinac).toHaveClass(
      'text-white/80',
      'hover:text-white',
      'focus-visible:ring-2',
      'focus-visible:ring-white/70',
    );
    expect(prepinac).not.toHaveClass('text-gray-500');
    expect(prepinac).not.toHaveClass('hover:text-purple-700');
  });

  it('prepínač v predvolenom tóne ostáva sivý', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} />);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    expect(prepinac).toHaveClass(
      'text-gray-500',
      'hover:text-purple-700',
      'dark:text-gray-400',
      'dark:hover:text-purple-300',
    );
    expect(prepinac).not.toHaveClass('text-white/80');
    expect(prepinac).not.toHaveClass('focus-visible:ring-white/70');
  });
});

describe('obal odseku (wrapText)', () => {
  function obalDiv(odsek: React.ReactElement) {
    return <div data-testid="obal-odseku">{odsek}</div>;
  }

  it('odsek je v obale a prepínač stojí mimo neho', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} wrapText={obalDiv} />);

    const obal = screen.getByTestId('obal-odseku');
    expect(within(obal).getByTestId('feed-post-caption')).toHaveTextContent(DLHY_TEXT);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    expect(obal.contains(prepinac)).toBe(false);
  });

  it('bez wrapText je odsek priamo v koreni a prepínač jeho súrodenec', async () => {
    nastavVysky({ presahuje: true });
    const { container } = render(<FeedPostCaption text={DLHY_TEXT} />);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.parentElement).toBe(container.firstElementChild);
    expect(prepinac.parentElement).toBe(container.firstElementChild);
    expect(screen.queryByTestId('obal-odseku')).toBeNull();
  });

  it('presah sa meria aj na obalenom odseku, takže „Viac“ pribudne', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} wrapText={obalDiv} />);

    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('krátky text v obale prepínač nemá', () => {
    nastavVysky({ presahuje: false });
    render(<FeedPostCaption text="Krátky text" wrapText={obalDiv} />);

    expect(screen.getByTestId('obal-odseku')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('prepínač rozbalí aj zbalí obalený odsek', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} wrapText={obalDiv} />);

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('line-clamp-3');

    await userEvent.click(screen.getByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
  });

  it('ťuk na odsek prejde do obalu, ťuk na prepínač nie', async () => {
    nastavVysky({ presahuje: true });
    const priTuku = jest.fn();
    render(
      <FeedPostCaption
        text={DLHY_TEXT}
        wrapText={(odsek) => (
          <button type="button" onClick={priTuku} data-testid="tlacidlo-obalu">
            {odsek}
          </button>
        )}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-post-caption'));
    expect(priTuku).toHaveBeenCalledTimes(1);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));
    expect(priTuku).toHaveBeenCalledTimes(1);
    // Prepínač nie je vnútri tlačidla: tlačidlo v tlačidle je neplatné HTML.
    expect(
      screen.getByTestId('feed-post-caption-toggle').closest('[data-testid="tlacidlo-obalu"]'),
    ).toBeNull();
  });
});

describe('stropy rozbaleného textu', () => {
  it('konštanta nesie stropy `compact`, `roomy` a `viewer`', () => {
    expect(BOUNDED_EXPANDED_MAX_HEIGHT.compact).toBe('max-h-[max(25vh,14rem)]');
    expect(BOUNDED_EXPANDED_MAX_HEIGHT.roomy).toBe('max-h-[40vh]');
    expect(BOUNDED_EXPANDED_MAX_HEIGHT.viewer).toBe('max-h-[40vh]');
  });

  it.each<[CaptionExpansionBound, string]>([
    ['compact', 'max-h-[max(25vh,14rem)]'],
    ['roomy', 'max-h-[40vh]'],
    ['viewer', 'max-h-[40vh]'],
  ])('rozbalený text so stropom „%s“ má triedu %s a vlastné posúvanie', async (strop, trieda) => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion expansionBound={strop} />);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass(trieda, 'overflow-y-auto', 'subtle-scrollbar');
    expect(odsek).toHaveAttribute('role', 'region');
    expect(odsek).toHaveAttribute('tabindex', '0');
    expect(odsek).not.toHaveClass('line-clamp-3');
  });

  it('bez uvedeného stropu platí `compact`', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion />);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[max(25vh,14rem)]');
  });

  it('bez `boundedExpansion` rozbalený text nemá strop ani vlastné posúvanie', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} expansionBound="viewer" />);

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toMatch(/max-h-\[/);
    expect(odsek).not.toHaveClass('overflow-y-auto');
    expect(odsek).not.toHaveAttribute('role');
    expect(odsek).not.toHaveAttribute('tabindex');
  });

  it('zbalený text nemá strop ani vlastné posúvanie, len orezanie na riadky', () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} boundedExpansion expansionBound="viewer" />);

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek).toHaveClass('line-clamp-3');
    expect(odsek.className).not.toMatch(/max-h-\[/);
    expect(odsek).not.toHaveClass('overflow-y-auto');
  });
});

describe('prepínač Viac a Menej', () => {
  it('text, ktorý sa zmestí, prepínač nemá', () => {
    nastavVysky({ presahuje: false });
    render(<FeedPostCaption text="Krátky text" />);

    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('dlhý text má „Viac“, po ťuku „Menej“ a po ďalšom ťuku zase „Viac“', async () => {
    nastavVysky({ presahuje: true });
    render(<FeedPostCaption text={DLHY_TEXT} />);

    const prepinac = await screen.findByTestId('feed-post-caption-toggle');
    expect(prepinac).toHaveTextContent('Viac');
    expect(prepinac).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(prepinac);
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('line-clamp-3');

    await userEvent.click(screen.getByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
  });
});
