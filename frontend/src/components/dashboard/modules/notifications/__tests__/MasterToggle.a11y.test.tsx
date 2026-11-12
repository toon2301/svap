import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import MasterToggle from '../MasterToggle';

/**
 * Prístupnosť hlavného vypínača „Vypnúť všetko“ (PR 258, CodeRabbit): tlačidlo je prepínač (`role="switch"`) s
 * oznamovaným stavom (`aria-checked`) a prístupným názvom. Názov preberá z viditeľného textu (`aria-labelledby`), nie z
 * kópie, takže sa text nezdvojí; v kompaktnom (mobilnom) rozložení, kde text vykresľuje rodič mimo komponentu, ho
 * prepojí cez `labelledBy` a `describedBy`.
 */
describe('MasterToggle: prístupný názov a stav', () => {
  it('je prepínač s názvom z viditeľného textu a text sa nezdvojí', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" />);

    const toggle = screen.getByRole('switch', { name: 'Vypnúť všetko' });
    expect(toggle.tagName).toBe('BUTTON');
    expect(screen.getAllByText('Vypnúť všetko')).toHaveLength(1);
  });

  it.each([
    [true, 'true'],
    [false, 'false'],
  ])('enabled %s oznamuje aria-checked %s', (enabled, expected) => {
    render(<MasterToggle enabled={enabled} onChange={jest.fn()} label="Vypnúť všetko" />);

    expect(screen.getByRole('switch', { name: 'Vypnúť všetko' })).toHaveAttribute('aria-checked', expected);
  });

  it('stav sa nezmení na neurčitý: pri neznámej polohe (null) a počas načítania aria-checked chýba', () => {
    const { rerender } = render(<MasterToggle enabled={null} onChange={jest.fn()} label="Vypnúť všetko" />);
    expect(screen.getByRole('switch', { name: 'Vypnúť všetko' })).not.toHaveAttribute('aria-checked');

    rerender(<MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" loading />);
    const loading = screen.getByRole('switch', { name: 'Vypnúť všetko' });
    expect(loading).not.toHaveAttribute('aria-checked');
    // Existujúce správanie ostáva: počas načítania je vypínač zaneprázdnený.
    expect(loading).toHaveAttribute('aria-busy', 'true');
  });

  it('kompaktné rozloženie: názov a opis preberá z prvkov vykreslených rodičom, bez vlastného textu', () => {
    render(
      <div>
        <div id="externy-nazov">Vypnúť všetko</div>
        <div id="externy-opis">Vypne všetky upozornenia okrem Správ.</div>
        <MasterToggle
          enabled
          onChange={jest.fn()}
          label=""
          compact
          labelledBy="externy-nazov"
          describedBy="externy-opis"
        />
      </div>,
    );

    const toggle = screen.getByRole('switch', { name: 'Vypnúť všetko' });
    expect(toggle).toHaveAccessibleDescription('Vypne všetky upozornenia okrem Správ.');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByText('Vypnúť všetko')).toHaveLength(1);
  });

  it('dva vypínače na jednej stránke (počítač a mobil) majú každý svoj názov a navzájom rôzne identifikátory', () => {
    render(
      <div>
        <MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" testId="a" />
        <MasterToggle enabled label="Vypnúť všetko" onChange={jest.fn()} testId="b" />
      </div>,
    );

    const first = screen.getByTestId('a');
    const second = screen.getByTestId('b');
    expect(first.getAttribute('aria-labelledby')).toBeTruthy();
    expect(second.getAttribute('aria-labelledby')).toBeTruthy();
    expect(first.getAttribute('aria-labelledby')).not.toBe(second.getAttribute('aria-labelledby'));
    expect(first).toHaveAccessibleName('Vypnúť všetko');
    expect(second).toHaveAccessibleName('Vypnúť všetko');
  });

  it('bez textu a bez prepojenia nemá vypínač názov (rodič ho musí poskytnúť)', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label="" compact testId="bez-nazvu" />);

    expect(screen.getByTestId('bez-nazvu')).toHaveAccessibleName('');
  });
});
