/**
 * Zámok ťahu prstom vo fullscreen vrstve (`useLightboxTouchPanLock`, nález 376, kolo 3c).
 *
 * Pri otvorenej klávesnici iPhone dovolí ťahom posúvať viditeľnú plochu a pripnutá vrstva (fotka, panel, pole) sa pri tom kýve.
 * Hook v koreni vrstvy zruší predvolenú akciu ťahu (`touchmove`) všade, kde sa nič posunúť nemá: mimo posuvných prvkov a na
 * hraniciach posuvného prvku. Posuvný zoznam sa v svojom rozsahu posúva ďalej, viacprstové gesto sa necháva prehliadaču.
 *
 * jsdom nemá rozloženie, preto sa rozmery posuvného prvku dodávajú (`scrollHeight`, `clientHeight`, `scrollTop`) a typ udalosti
 * je obyčajný `Event` s vlastnosťou `touches`. Hook číta len `touches`, `target` a `cancelable`.
 */

import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { canScrollInDirection, useLightboxTouchPanLock } from '../useLightboxTouchPanLock';

function Vrstva({ active = true }: { active?: boolean }) {
  const koren = useRef<HTMLDivElement | null>(null);
  useLightboxTouchPanLock(koren, active);
  return (
    <div data-testid="obal" style={{ overflowY: 'auto' }}>
      <div ref={koren} data-testid="koren">
        <div data-testid="mimo">fotka a hlavička</div>
        <div data-testid="zoznam" style={{ overflowY: 'auto' }}>
          <p data-testid="komentar">komentár</p>
        </div>
      </div>
    </div>
  );
}

function nastavRozmery(prvok: HTMLElement, rozmery: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  Object.defineProperty(prvok, 'scrollHeight', { value: rozmery.scrollHeight, configurable: true });
  Object.defineProperty(prvok, 'clientHeight', { value: rozmery.clientHeight, configurable: true });
  Object.defineProperty(prvok, 'scrollTop', { value: rozmery.scrollTop, configurable: true, writable: true });
}

/** Zoznam s obsahom 1 000 px v okne 300 px; `scrollTop` rozhoduje, či je na začiatku, v strede alebo na konci. */
function dlhyZoznam(scrollTop: number) {
  nastavRozmery(screen.getByTestId('zoznam'), { scrollHeight: 1000, clientHeight: 300, scrollTop });
}

/** Pošle začiatok dotyku v `y0` a jeden pohyb do `y1`; vráti, či sa predvolená akcia pohybu zrušila. */
function tah(cielovy: HTMLElement, y0: number, y1: number, pocetPrstov = 1) {
  const prsty = (y: number) => Array.from({ length: pocetPrstov }, () => ({ clientY: y }));
  const zaciatok = new Event('touchstart', { bubbles: true, cancelable: true });
  Object.assign(zaciatok, { touches: prsty(y0) });
  cielovy.dispatchEvent(zaciatok);
  const pohyb = new Event('touchmove', { bubbles: true, cancelable: true });
  Object.assign(pohyb, { touches: prsty(y1) });
  cielovy.dispatchEvent(pohyb);
  return pohyb.defaultPrevented;
}

describe('ťah mimo posuvných prvkov', () => {
  it('sa zruší: fotka, hlavička ani pole sa nesmú hýbať', () => {
    render(<Vrstva />);

    expect(tah(screen.getByTestId('mimo'), 300, 200)).toBe(true);
    expect(tah(screen.getByTestId('mimo'), 200, 320)).toBe(true);
  });

  it('krátky zoznam, ktorý sa celý zmestí, sa nepohne ani ťahom po ňom', () => {
    render(<Vrstva />);
    nastavRozmery(screen.getByTestId('zoznam'), { scrollHeight: 300, clientHeight: 300, scrollTop: 0 });

    expect(tah(screen.getByTestId('komentar'), 300, 200)).toBe(true);
    expect(tah(screen.getByTestId('komentar'), 200, 320)).toBe(true);
  });
});

describe('ťah v posuvnom zozname', () => {
  it('v strede zoznamu sa nechá v oboch smeroch (zoznam sa posúva)', () => {
    render(<Vrstva />);
    dlhyZoznam(200);

    expect(tah(screen.getByTestId('komentar'), 300, 200)).toBe(false);
    expect(tah(screen.getByTestId('komentar'), 200, 320)).toBe(false);
  });

  it('na začiatku sa ťah nadol (späť) zruší a ťah nahor sa nechá', () => {
    render(<Vrstva />);
    dlhyZoznam(0);

    expect(tah(screen.getByTestId('komentar'), 200, 320)).toBe(true);
    expect(tah(screen.getByTestId('komentar'), 300, 200)).toBe(false);
  });

  it('na konci sa ťah nahor (ďalej) zruší a ťah nadol sa nechá', () => {
    render(<Vrstva />);
    dlhyZoznam(700);

    expect(tah(screen.getByTestId('komentar'), 300, 200)).toBe(true);
    expect(tah(screen.getByTestId('komentar'), 200, 320)).toBe(false);
  });

  it('zlomky pixelov pri okraji sa považujú za okraj (iPhone vracia desatinné `scrollTop`)', () => {
    render(<Vrstva />);
    dlhyZoznam(0.5);
    expect(tah(screen.getByTestId('komentar'), 200, 320)).toBe(true);

    dlhyZoznam(699.5);
    expect(tah(screen.getByTestId('komentar'), 300, 200)).toBe(true);
  });

  it('smer sa posudzuje podľa posledného pohybu, nie podľa začiatku dotyku', () => {
    render(<Vrstva />);
    const cielovy = screen.getByTestId('komentar');
    dlhyZoznam(0);

    const zaciatok = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.assign(zaciatok, { touches: [{ clientY: 200 }] });
    cielovy.dispatchEvent(zaciatok);
    const hore = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.assign(hore, { touches: [{ clientY: 150 }] });
    cielovy.dispatchEvent(hore);
    // Prst sa vrátil nadol, hoci je stále nad miestom, kde dotyk začal: zoznam je na začiatku, ťah sa musí zrušiť.
    const dole = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.assign(dole, { touches: [{ clientY: 180 }] });
    cielovy.dispatchEvent(dole);

    expect(hore.defaultPrevented).toBe(false);
    expect(dole.defaultPrevented).toBe(true);
  });

  it('vodorovný pohyb bez posunu nahor či nadol sa zruší', () => {
    render(<Vrstva />);
    dlhyZoznam(200);

    expect(tah(screen.getByTestId('komentar'), 250, 250)).toBe(true);
  });
});

describe('výnimky', () => {
  it('viacprstové gesto (priblíženie) sa necháva prehliadaču', () => {
    render(<Vrstva />);

    expect(tah(screen.getByTestId('mimo'), 300, 200, 2)).toBe(false);
  });

  it('posuvný predok mimo koreňa vrstvy sa nezohľadňuje', () => {
    render(<Vrstva />);
    nastavRozmery(screen.getByTestId('obal'), { scrollHeight: 2000, clientHeight: 300, scrollTop: 500 });

    expect(tah(screen.getByTestId('mimo'), 300, 200)).toBe(true);
  });

  it('neaktívny zámok nič nezruší', () => {
    render(<Vrstva active={false} />);

    expect(tah(screen.getByTestId('mimo'), 300, 200)).toBe(false);
  });

  it('po vypnutí zámku (aj po odmontovaní) sa poslucháče odoberú', () => {
    const odober = jest.spyOn(Element.prototype, 'removeEventListener');
    const { rerender, unmount } = render(<Vrstva />);
    expect(tah(screen.getByTestId('mimo'), 300, 200)).toBe(true);

    rerender(<Vrstva active={false} />);
    expect(tah(screen.getByTestId('mimo'), 300, 200)).toBe(false);
    expect(odober).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(odober).toHaveBeenCalledWith('touchstart', expect.any(Function));

    odober.mockClear();
    rerender(<Vrstva />);
    unmount();
    expect(odober).toHaveBeenCalledWith('touchmove', expect.any(Function));
    odober.mockRestore();
  });
});

describe('canScrollInDirection', () => {
  it('bez cieľového prvku (alebo s cieľom, ktorý nie je prvok) nič neposúva', () => {
    const koren = document.createElement('div');

    expect(canScrollInDirection(null, koren, -10)).toBe(false);
    expect(canScrollInDirection(document, koren, -10)).toBe(false);
  });
});
