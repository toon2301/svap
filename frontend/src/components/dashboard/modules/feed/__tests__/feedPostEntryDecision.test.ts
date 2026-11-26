/**
 * Priamy vstup na adresu príspevku.
 *
 * Predtým appka na `/dashboard/feed/<id>` ukázala SAMOSTATNÚ celoobrazovkovú
 * stránku bez Nástenky. Teraz má aj chladný vstup (odkaz, F5) skončiť rovnako
 * ako klik vo feede: Nástenka na pozadí a detail príspevku nad ňou. Rozhodnutie
 * nezávisí od šírky okna: na počítači je detail okno, na mobile obrazovka, a
 * ktorú podobu nakresliť, vyberá až `FeedPostDetailSwitch` (nález 360).
 */

import { decideFeedPostEntry } from '../feedPostEntryDecision';

/** Východiskový stav: chladný vstup na permalink. */
function directEntry(overrides: Partial<Parameters<typeof decideFeedPostEntry>[0]> = {}) {
  return {
    pathPostId: 7,
    overlayOpen: false,
    historyBusy: false,
    liveUrl: '/dashboard/feed/7',
    ...overrides,
  };
}

describe('priamy vstup', () => {
  it('shows the feed with the window on top, not a separate page', () => {
    expect(decideFeedPostEntry(directEntry())).toEqual({
      kind: 'overlay',
      target: { postId: 7, highlightCommentId: null },
    });
  });

  it('behaves the same after a reload of an already open window', () => {
    // F5 nad otvoreným oknom = presne ten istý vstup: adresa ukazuje na
    // príspevok a appka o žiadnom okne nevie, lebo sa práve naštartovala.
    expect(decideFeedPostEntry(directEntry({ overlayOpen: false }))).toEqual({
      kind: 'overlay',
      target: { postId: 7, highlightCommentId: null },
    });
  });

  it('carries the highlighted comment from the link', () => {
    expect(
      decideFeedPostEntry(
        directEntry({ liveUrl: '/dashboard/feed/7?comment=42' }),
      ),
    ).toEqual({ kind: 'overlay', target: { postId: 7, highlightCommentId: 42 } });
  });
});

describe('nič sa nedeje, keď netreba', () => {
  it('does nothing when the window already shows the post', () => {
    expect(decideFeedPostEntry(directEntry({ overlayOpen: true }))).toEqual({
      kind: 'none',
    });
  });

  it('does not reopen the window while the step back is still running', () => {
    // Skutočná adresa ešte ukazuje na príspevok, hoci okno je už zavreté.
    expect(decideFeedPostEntry(directEntry({ historyBusy: true }))).toEqual({
      kind: 'none',
    });
  });

  it('does not reopen the window once the address moved on', () => {
    // Opačné oneskorenie: router ešte hlási príspevok, adresa je už na
    // Nástenke (tak sa zatvára okno otvorené priamym vstupom).
    expect(
      decideFeedPostEntry(directEntry({ liveUrl: '/dashboard' })),
    ).toEqual({ kind: 'none' });
  });

  it('ignores paths that are not a post', () => {
    expect(
      decideFeedPostEntry(directEntry({ pathPostId: null, liveUrl: '/dashboard' })),
    ).toEqual({ kind: 'none' });
  });
});
