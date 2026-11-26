/**
 * Výber podoby detailu príspevku podľa šírky okna prehliadača (nález 360, krok 2 zrušenia starého spôsobu detailu príspevku).
 *
 * Cieľ okna (upozornenie, adresa príspevku) je jeden; na počítači ho ukazuje okno (`FeedPostDetailOverlay`), na mobile
 * obrazovka (`FeedPostMobileDetailHost`). Obe podoby sú tu atrapy, ktoré zachytia vlastnosti, a šírku okna určuje atrapa
 * hooku `useIsMobileState`, takže sa overuje len výber: ktorá podoba sa nakreslí, čo dostane, a že sa pred vyriešením šírky
 * nenakreslí ani jedna (inak by na mobile na okamih vzniklo okno pre počítač s vlastným načítaním príspevku).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailSwitch from '../FeedPostDetailSwitch';

type CielProps = { postId: number; highlightCommentId: number | null; onClose: () => void };

let mockViewport = { isMobile: false, isResolved: true };
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockViewport.isMobile,
  useIsMobileState: () => mockViewport,
}));

let mockOknoProps: CielProps | null = null;
let mockObrazovkaProps: CielProps | null = null;
jest.mock('../FeedPostDetailOverlay', () => ({
  __esModule: true,
  default: function MockFeedPostDetailOverlay(props: CielProps) {
    mockOknoProps = props;
    return <div data-testid="feed-overlay" />;
  },
}));
jest.mock('../FeedPostMobileDetailHost', () => ({
  __esModule: true,
  default: function MockFeedPostMobileDetailHost(props: CielProps) {
    mockObrazovkaProps = props;
    return <div data-testid="feed-mobile-host" />;
  },
}));

const jeOknoOtvorene = () => screen.queryByTestId('feed-overlay') !== null;
const jeObrazovkaOtvorena = () => screen.queryByTestId('feed-mobile-host') !== null;

function vykresli(highlightCommentId: number | null = 12) {
  const onClose = jest.fn();
  // Nový prvok pri každom vykreslení: ten istý prvok by React preskočil a hook by sa nepýtal na novú šírku okna.
  const strom = () => (
    <FeedPostDetailSwitch postId={7} highlightCommentId={highlightCommentId} onClose={onClose} />
  );
  const view = render(strom());
  return { ...view, onClose, prekresli: () => view.rerender(strom()) };
}

beforeEach(() => {
  mockViewport = { isMobile: false, isResolved: true };
  mockOknoProps = null;
  mockObrazovkaProps = null;
});

describe('výber podoby detailu príspevku podľa šírky okna', () => {
  it('na počítači nakreslí okno a obrazovku nie', () => {
    vykresli();

    expect(jeOknoOtvorene()).toBe(true);
    expect(jeObrazovkaOtvorena()).toBe(false);
  });

  it('na mobile nakreslí obrazovku a okno nie', () => {
    mockViewport = { isMobile: true, isResolved: true };

    vykresli();

    expect(jeObrazovkaOtvorena()).toBe(true);
    expect(jeOknoOtvorene()).toBe(false);
  });

  it('okno dostane číslo príspevku, komentár a obsluhu zatvorenia', () => {
    const { onClose } = vykresli(12);

    expect(mockOknoProps?.postId).toBe(7);
    expect(mockOknoProps?.highlightCommentId).toBe(12);
    expect(mockOknoProps?.onClose).toBe(onClose);
  });

  it('obrazovka dostane číslo príspevku, komentár a obsluhu zatvorenia', () => {
    mockViewport = { isMobile: true, isResolved: true };

    const { onClose } = vykresli(12);

    expect(mockObrazovkaProps?.postId).toBe(7);
    expect(mockObrazovkaProps?.highlightCommentId).toBe(12);
    expect(mockObrazovkaProps?.onClose).toBe(onClose);
  });

  it('bez komentára dostanú obe podoby null', () => {
    const desktop = vykresli(null);
    expect(mockOknoProps?.highlightCommentId).toBeNull();
    desktop.unmount();

    mockViewport = { isMobile: true, isResolved: true };
    vykresli(null);
    expect(mockObrazovkaProps?.highlightCommentId).toBeNull();
  });
});

describe('výber podoby detailu príspevku: šírka okna ešte nie je vyriešená', () => {
  it('na počítači aj na mobile sa nenakreslí ani okno, ani obrazovka', () => {
    mockViewport = { isMobile: false, isResolved: false };
    const desktop = vykresli();
    expect(jeOknoOtvorene()).toBe(false);
    expect(jeObrazovkaOtvorena()).toBe(false);
    desktop.unmount();

    mockViewport = { isMobile: true, isResolved: false };
    vykresli();
    expect(jeOknoOtvorene()).toBe(false);
    expect(jeObrazovkaOtvorena()).toBe(false);
  });

  it('po vyriešení šírky sa nakreslí podoba podľa šírky a okno pre počítač nevznikne ani na okamih', () => {
    // Skutočný hook hlási pred vyriešením `isMobile: false`; bez čakania by sa na mobile najprv nakreslilo okno pre počítač.
    mockViewport = { isMobile: false, isResolved: false };
    const { prekresli } = vykresli();
    expect(mockOknoProps).toBeNull();

    mockViewport = { isMobile: true, isResolved: true };
    prekresli();

    expect(jeObrazovkaOtvorena()).toBe(true);
    expect(jeOknoOtvorene()).toBe(false);
    expect(mockOknoProps).toBeNull();
  });
});

describe('výber podoby detailu príspevku: zmena šírky pri otvorenom detaile', () => {
  it('z počítača na mobil okno vymení obrazovka s tým istým príspevkom a komentárom', () => {
    const { prekresli } = vykresli(12);
    expect(jeOknoOtvorene()).toBe(true);

    mockViewport = { isMobile: true, isResolved: true };
    prekresli();

    expect(jeOknoOtvorene()).toBe(false);
    expect(jeObrazovkaOtvorena()).toBe(true);
    expect(mockObrazovkaProps?.postId).toBe(7);
    expect(mockObrazovkaProps?.highlightCommentId).toBe(12);
  });

  it('z mobilu na počítač obrazovku vymení okno', () => {
    mockViewport = { isMobile: true, isResolved: true };
    const { prekresli } = vykresli(12);
    expect(jeObrazovkaOtvorena()).toBe(true);

    mockViewport = { isMobile: false, isResolved: true };
    prekresli();

    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(jeOknoOtvorene()).toBe(true);
    expect(mockOknoProps?.postId).toBe(7);
    expect(mockOknoProps?.highlightCommentId).toBe(12);
  });
});
