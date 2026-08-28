/**
 * Ovládateľný IntersectionObserver pre testy donačítavania.
 *
 * jsdom observer nemá, a aj keby mal, bez layoutu by sa nikdy nepretol.
 * Každé `observe()` sa preto zaregistruje ako funkcia, ktorou test pretnutie
 * vyvolá ručne – a keďže si drží aj sledovaný uzol, dá sa spustiť práve to
 * donačítavanie, o ktoré v teste ide (napr. jedno konkrétne vlákno odpovedí).
 */

export type FiringObserver = {
  /** Spustí VŠETKY zaregistrované sentinely. */
  fireAll: () => void;
  /** Spustí len sentinel s daným `data-testid`. */
  fire: (testId: string) => void;
  /** Koľko sentinelov je práve sledovaných. */
  count: () => number;
  restore: () => void;
};

export function installFiringIntersectionObserver(): FiringObserver {
  const entries: Array<{ node: Element; fire: () => void; owner: unknown }> = [];
  const original = (global as unknown as { IntersectionObserver: unknown })
    .IntersectionObserver;

  class MockObserver {
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe = (node: Element) => {
      entries.push({
        node,
        owner: this,
        fire: () =>
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      });
    };

    // Odregistrovanie: sentinel odmountovaného vlákna sa už nesmie dať spustiť.
    disconnect = () => {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (entries[index].owner === this) entries.splice(index, 1);
      }
    };

    unobserve = () => undefined;
    takeRecords = () => [];
    root = null;
    rootMargin = '';
    thresholds = [];
  }

  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockObserver;

  return {
    fireAll: () => entries.forEach((entry) => entry.fire()),
    fire: (testId: string) => {
      entries
        .filter((entry) => entry.node.getAttribute('data-testid') === testId)
        .forEach((entry) => entry.fire());
    },
    count: () => entries.length,
    restore: () => {
      (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
        original;
    },
  };
}
