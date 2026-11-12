import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import MasterToggle from '../MasterToggle';

/**
 * Prístupnosť hlavného vypínača „Vypnúť všetko“ (PR 258, CodeRabbit): pri známej polohe je tlačidlo prepínač
 * (`role="switch"`) s oznamovaným stavom (`aria-checked`) a prístupným názvom. Názov preberá z viditeľného textu
 * (`aria-labelledby`), nie z kópie, takže sa text nezdvojí; v kompaktnom (mobilnom) rozložení, kde text vykresľuje rodič
 * mimo komponentu, ho prepojí cez `labelledBy` a `describedBy`. Kým sa poloha načítava alebo je neznáma, prepínač to nie
 * je: prepínač bez `aria-checked` vystavuje prehliadač ako vypnutý (`checked: false`) a čítačka by ho tak oznámila,
 * preto je vtedy zakázané pomenované tlačidlo bez stavu.
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

  it('neznáma poloha (null): nie je prepínač, ale zakázané pomenované tlačidlo bez stavu', () => {
    render(<MasterToggle enabled={null} onChange={jest.fn()} label="Vypnúť všetko" />);

    // Prepínač bez aria-checked by prehliadač vystavil ako vypnutý (checked false); čítačka by oznámila nepravdivé „vypnuté“.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Vypnúť všetko' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-checked');
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('počas načítania: nie je prepínač, ale zakázané zaneprázdnené pomenované tlačidlo bez stavu', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" loading />);

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Vypnúť všetko' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-checked');
    // Existujúce správanie ostáva: počas načítania je vypínač zaneprázdnený.
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('kompaktné rozložení bez známej polohy: názov a opis sa prepoja aj bez role prepínača', () => {
    render(
      <div>
        <div id="externy-nazov">Vypnúť všetko</div>
        <div id="externy-opis">Vypne všetky upozornenia okrem Správ.</div>
        <MasterToggle
          enabled={null}
          onChange={jest.fn()}
          label=""
          compact
          labelledBy="externy-nazov"
          describedBy="externy-opis"
        />
      </div>,
    );

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Vypnúť všetko' });
    expect(button).toHaveAccessibleDescription('Vypne všetky upozornenia okrem Správ.');
  });

  it('po načítaní sa z tlačidla stane prepínač s oznámeným stavom a po opätovnom načítaní späť', () => {
    const { rerender } = render(<MasterToggle enabled={null} onChange={jest.fn()} label="Vypnúť všetko" loading />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();

    rerender(<MasterToggle enabled onChange={jest.fn()} label="Vypnúť všetko" />);
    expect(screen.getByRole('switch', { name: 'Vypnúť všetko' })).toHaveAttribute('aria-checked', 'true');

    rerender(<MasterToggle enabled onChange={jest.fn()} label="Vypnúť všetko" loading />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vypnúť všetko' })).toBeDisabled();
  });

  it('zakázaný prepínač so známou polohou ostáva prepínačom s oznámeným stavom', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" disabled />);

    const toggle = screen.getByRole('switch', { name: 'Vypnúť všetko' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
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
