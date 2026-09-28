/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 * Priradenie príčiny zmeny scrollTop a zlučovanie segmentov.
 */

import {
  JS_SMOOTH_WINDOW_MS,
  JS_WRITE_WINDOW_MS,
  SEGMENT_GAP_MS,
  SMOOTH_TARGET_TOLERANCE_PX,
  classifyScrollChange,
  estimateIntoViewTarget,
  formatSegment,
  formatCause,
  isSegmentStale,
  mergeScrollChange,
  touchContext,
  type ScrollChange,
  type ScrollWriteRecord,
} from '../scrollDebugCause';

const T = 10_000;

function change(overrides: Partial<ScrollChange>): ScrollChange {
  return { t: T, previousT: T - 16, from: 0, to: 0, heightBefore: 2426, heightAfter: 2426, clientHeight: 659, ...overrides };
}

const instant = (t: number, after: number, before = 0): ScrollWriteRecord => ({
  t,
  smooth: false,
  before,
  after,
  target: null,
});

const smooth = (t: number, before: number, target: number | null): ScrollWriteRecord => ({
  t,
  smooth: true,
  before,
  after: null,
  target,
});

describe('classifyScrollChange – js-write', () => {
  it('zápis presne 100 ms pred zmenou s tou istou hodnotou je js-write', () => {
    expect(classifyScrollChange(change({ from: 0, to: 500 }), [instant(T - JS_WRITE_WINDOW_MS, 500)])).toBe('js-write');
  });

  it('zápis 101 ms pred zmenou už príčinou nie je', () => {
    expect(classifyScrollChange(change({ from: 0, to: 500 }), [instant(T - JS_WRITE_WINDOW_MS - 1, 500)])).toBe('NONE');
  });

  it('zápis v tej istej milisekunde ako zmena je js-write', () => {
    expect(classifyScrollChange(change({ from: 0, to: 500 }), [instant(T, 500)])).toBe('js-write');
  });

  it('zápis až PO zmene sa nepočíta', () => {
    expect(classifyScrollChange(change({ from: 0, to: 500 }), [instant(T + 1, 500)])).toBe('NONE');
  });

  it('rozhodujúci prípad: zápis 0 a o 20 ms skok na 1767 je NONE, nie js-write', () => {
    expect(classifyScrollChange(change({ from: 0, to: 1767 }), [instant(T - 20, 0)])).toBe('NONE');
  });

  it('hodnota sa porovnáva s toleranciou ±2 px', () => {
    expect(classifyScrollChange(change({ from: 700, to: 2 }), [instant(T - 5, 0, 700)])).toBe('js-write');
    expect(classifyScrollChange(change({ from: 0, to: 3 }), [instant(T - 5, 0)])).toBe('NONE');
  });

  it('zablokované vlákno: zápis starší než 100 ms, ale od predošlej snímky, je js-write', () => {
    // Skutočný WebKit: reset pri +5 ms, prvá snímka až pri +567 ms.
    const blocked = change({ previousT: T - 567, from: 706, to: 0, heightBefore: 2179, heightAfter: 11245 });
    expect(classifyScrollChange(blocked, [instant(T - 562, 0, 303)])).toBe('js-write');
  });

  it('zápis starší než 100 ms a pred predošlou snímkou príčinou nie je', () => {
    expect(classifyScrollChange(change({ from: 706, to: 0 }), [instant(T - 101, 0)])).toBe('NONE');
  });

  it('rozhodujúci prípad z iPhonu: reset 0 a potom maximum zmenšeného obsahu je NONE, nie orezanie', () => {
    // Snímky vidia 7023→1767 pri zmenšení 11245→2426 (vyzerá ako orezanie),
    // no reset medzi nimi nechal 0 – hodnota teda po zápise STÚPLA.
    const jump = change({ previousT: T - 30, from: 7023, to: 1767, heightBefore: 11245, heightAfter: 2426 });
    expect(classifyScrollChange(jump, [instant(T - 20, 0)])).toBe('NONE');
    expect(classifyScrollChange(jump, [])).toBe('layout-clamp');
  });

  it('rozhoduje POSLEDNÝ okamžitý zápis', () => {
    const writes = [instant(T - 50, 1767), instant(T - 30, 0)];
    expect(classifyScrollChange(change({ from: 0, to: 1767 }), writes)).toBe('NONE');
    expect(classifyScrollChange(change({ from: 1767, to: 0 }), writes)).toBe('js-write');
  });
});

describe('classifyScrollChange – js-smooth', () => {
  it('do 1500 ms a na dráhe medzi štartom a cieľom', () => {
    expect(classifyScrollChange(change({ from: 0, to: 300 }), [smooth(T - JS_SMOOTH_WINDOW_MS, 0, 706)])).toBe(
      'js-smooth',
    );
  });

  it('1501 ms po spustení už nie', () => {
    expect(
      classifyScrollChange(change({ from: 0, to: 300 }), [smooth(T - JS_SMOOTH_WINDOW_MS - 1, 0, 706)]),
    ).toBe('NONE');
  });

  it('plynulý scroll smerom HORE (zospodu) je tiež js-smooth', () => {
    expect(classifyScrollChange(change({ from: 1767, to: 1200 }), [smooth(T - 200, 1767, 706)])).toBe('js-smooth');
  });

  it('skok mimo dráhy počas plynulého scrollu je NONE', () => {
    expect(classifyScrollChange(change({ from: 300, to: 1767 }), [smooth(T - 200, 0, 706)])).toBe('NONE');
  });

  it(`tolerancia cieľa ${SMOOTH_TARGET_TOLERANCE_PX} px`, () => {
    const writes = [smooth(T - 200, 0, 706)];
    expect(classifyScrollChange(change({ from: 600, to: 706 + SMOOTH_TARGET_TOLERANCE_PX }), writes)).toBe('js-smooth');
    expect(classifyScrollChange(change({ from: 600, to: 706 + SMOOTH_TARGET_TOLERANCE_PX + 1 }), writes)).toBe('NONE');
  });

  it('neznámy cieľ (scrollIntoView block nearest) prijme ľubovoľnú hodnotu v čase', () => {
    expect(classifyScrollChange(change({ from: 0, to: 5000 }), [smooth(T - 10, 0, null)])).toBe('js-smooth');
  });

  it('skok PRED plynulým scrollom (INTOVIEW pred=1440 po snímke 0) nie je js-smooth', () => {
    // Snímka videla 0, volanie o 30 ms neskôr už štartovalo z 1440.
    const jump = change({ previousT: T - 32, from: 0, to: 1440, heightBefore: 791, heightAfter: 2175 });
    expect(classifyScrollChange(jump, [smooth(T - 2, 1440, 666)])).toBe('NONE');
  });

  it('plynulý scroll spustený od snímky z tej istej hodnoty ostáva js-smooth', () => {
    expect(classifyScrollChange(change({ previousT: T - 16, from: 0, to: 300 }), [smooth(T - 2, 0, 666)])).toBe(
      'js-smooth',
    );
  });

  it('plynulý scroll spustený pred predošlou snímkou sa posudzuje podľa dráhy', () => {
    expect(classifyScrollChange(change({ previousT: T - 16, from: 1200, to: 1000 }), [smooth(T - 100, 1440, 666)])).toBe(
      'js-smooth',
    );
  });

  it('plynulý zápis sa nepočíta ako okamžitý', () => {
    expect(classifyScrollChange(change({ from: 0, to: 5000 }), [smooth(T - 10, 0, 706)])).toBe('NONE');
  });
});

describe('classifyScrollChange – layout-clamp', () => {
  it('obsah sa zmenšil a hodnota klesla presne na nové maximum', () => {
    expect(
      classifyScrollChange(change({ from: 7023, to: 132, heightBefore: 11245, heightAfter: 791 }), []),
    ).toBe('layout-clamp');
  });

  it('aj pod maximum – orezanie pri medzivýške, ktorú snímka nevidela', () => {
    expect(classifyScrollChange(change({ from: 7023, to: 0, heightBefore: 11245, heightAfter: 791 }), [])).toBe(
      'layout-clamp',
    );
  });

  it('nad maximum + 1 px to orezanie nie je', () => {
    const shrink = { from: 7023, heightBefore: 11245, heightAfter: 791 };
    expect(classifyScrollChange(change({ ...shrink, to: 133 }), [])).toBe('layout-clamp');
    expect(classifyScrollChange(change({ ...shrink, to: 134 }), [])).toBe('NONE');
  });

  it('bez zmenšenia obsahu to orezanie nie je', () => {
    expect(classifyScrollChange(change({ from: 700, to: 0 }), [])).toBe('NONE');
  });

  it('stúpnutie hodnoty nie je nikdy orezanie', () => {
    expect(classifyScrollChange(change({ from: 0, to: 100, heightBefore: 11245, heightAfter: 791 }), [])).toBe(
      'NONE',
    );
  });
});

describe('touchContext', () => {
  it('žiadny ťah, alebo až po konci úseku', () => {
    expect(touchContext(null, 100, 200, 3000)).toBeNull();
    expect(touchContext(201, 100, 200, 3000)).toBeNull();
  });

  it('ťah počas úseku (scroll prstom) – nie „bez touchmove"', () => {
    expect(touchContext(100, 100, 200, 3000)).toBe('during');
    expect(touchContext(200, 100, 200, 3000)).toBe('during');
    expect(formatCause('NONE', 'during')).toBe('!!! NONE (touchmove počas)');
  });

  it('ťah pred úsekom: ms pred začiatkom, len do 3 s', () => {
    expect(touchContext(40, 100, 200, 3000)).toBe(60);
    expect(touchContext(100 - 3000, 100, 200, 3000)).toBe(3000);
    expect(touchContext(99 - 3000, 100, 200, 3000)).toBeNull();
  });
});

describe('estimateIntoViewTarget', () => {
  const base = { scrollTop: 0, maxScroll: 5000, boxTop: 64, boxHeight: 659, elTop: 1064, elHeight: 200 };

  it('block center/start/end', () => {
    expect(estimateIntoViewTarget({ ...base, block: 'center' })).toBe(771);
    expect(estimateIntoViewTarget({ ...base, block: 'start' })).toBe(1000);
    expect(estimateIntoViewTarget({ ...base, block: 'end' })).toBe(541);
  });

  it('počíta od aktuálnej pozície a oreže na rozsah scrollera', () => {
    expect(estimateIntoViewTarget({ ...base, scrollTop: 1767, elTop: -500, block: 'start' })).toBe(1203);
    expect(estimateIntoViewTarget({ ...base, maxScroll: 600, block: 'start' })).toBe(600);
    expect(estimateIntoViewTarget({ ...base, elTop: -5000, block: 'start' })).toBe(0);
  });

  it('nearest sa neodhaduje', () => {
    expect(estimateIntoViewTarget({ ...base, block: 'nearest' })).toBeNull();
  });
});

describe('zlučovanie segmentov', () => {
  const step = (t: number, from: number, to: number, cause: 'js-smooth' | 'NONE' = 'js-smooth') => ({
    t,
    from,
    to,
    cause,
    height: 2426,
  });

  it('súvislé zmeny s rovnakou príčinou sú jeden segment', () => {
    let open = mergeScrollChange(null, step(100, 0, 100)).open;
    open = mergeScrollChange(open, step(116, 100, 250)).open;
    const result = mergeScrollChange(open, step(132, 250, 706));
    expect(result.closed).toBeNull();
    expect(result.open).toMatchObject({ start: 100, end: 132, from: 0, to: 706, frames: 3, cause: 'js-smooth' });
    expect(formatSegment(result.open, null)).toBe('SCROLL 0→706 32ms/3f sh=2426 js-smooth');
  });

  it('iná príčina uzavrie segment a otvorí nový', () => {
    const open = mergeScrollChange(null, step(100, 0, 100)).open;
    const result = mergeScrollChange(open, step(116, 100, 1767, 'NONE'));
    expect(result.closed).toMatchObject({ from: 0, to: 100, frames: 1 });
    expect(result.open).toMatchObject({ from: 100, to: 1767, cause: 'NONE' });
  });

  it(`medzera ${SEGMENT_GAP_MS} ms sa ešte spojí, o 1 ms viac už nie`, () => {
    const open = mergeScrollChange(null, step(100, 0, 100)).open;
    expect(mergeScrollChange(open, step(100 + SEGMENT_GAP_MS, 100, 200)).closed).toBeNull();
    expect(mergeScrollChange(open, step(100 + SEGMENT_GAP_MS + 1, 100, 200)).closed).not.toBeNull();
    expect(isSegmentStale(open, 100 + SEGMENT_GAP_MS)).toBe(false);
    expect(isSegmentStale(open, 100 + SEGMENT_GAP_MS + 1)).toBe(true);
    expect(isSegmentStale(null, 99_999)).toBe(false);
  });

  it('nenadväzujúca hodnota je nový segment', () => {
    const open = mergeScrollChange(null, step(100, 0, 100)).open;
    expect(mergeScrollChange(open, step(116, 400, 500)).closed).not.toBeNull();
  });

  it('NONE je v riadku zreteľné, aj s posledným ťahom prstom', () => {
    const segment = mergeScrollChange(null, step(100, 0, 1767, 'NONE')).open;
    expect(formatSegment(segment, null)).toBe('SCROLL 0→1767 0ms/1f sh=2426 !!! NONE (bez touchmove)');
    expect(formatSegment(segment, 120.4)).toBe('SCROLL 0→1767 0ms/1f sh=2426 !!! NONE (touchmove −120ms)');
  });
});
