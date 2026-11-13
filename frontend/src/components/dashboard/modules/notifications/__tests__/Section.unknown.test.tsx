import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import Section from '../Section';

/**
 * Neznáma hodnota v `Section` (PR 258, CodeRabbit): po zlyhaní načítania zo servera je hodnota `null` a žiadna z dvoch
 * volieb nesmie vyzerať ako vybraná. Predtým sa ukázala predvolená hodnota, ktorá nie je stav servera.
 */

/** Je riadok voľby vybraný? Vybraný kruh (ToggleCircle) má čierne pozadie. */
const isSelected = (button: HTMLElement) =>
  (button.querySelector('div > div') as HTMLElement).className.includes('bg-black');

const renderSection = (value: boolean | null, disabled = false) =>
  render(
    <Section
      title="Sekcia"
      description="Popis"
      value={value}
      setValue={jest.fn()}
      disabled={disabled}
      offLabel="Vypnuté"
      onLabel="Zapnuté"
      desktop
    />,
  );

describe('Section: neznáma hodnota', () => {
  it('hodnota null: žiadny riadok nie je vybraný, ale oba sú vykreslené', () => {
    renderSection(null, true);

    const off = screen.getByRole('button', { name: 'Vypnuté' });
    const on = screen.getByRole('button', { name: 'Zapnuté' });
    expect(isSelected(off)).toBe(false);
    expect(isSelected(on)).toBe(false);
    expect(off).toBeDisabled();
    expect(on).toBeDisabled();
  });

  it('hodnota false vyberie „Vypnuté“ a hodnota true vyberie „Zapnuté“ (bez zmeny oproti doterajšiemu správaniu)', () => {
    const { unmount } = renderSection(false);
    expect(isSelected(screen.getByRole('button', { name: 'Vypnuté' }))).toBe(true);
    expect(isSelected(screen.getByRole('button', { name: 'Zapnuté' }))).toBe(false);
    unmount();

    renderSection(true);
    expect(isSelected(screen.getByRole('button', { name: 'Vypnuté' }))).toBe(false);
    expect(isSelected(screen.getByRole('button', { name: 'Zapnuté' }))).toBe(true);
  });

  it('prechod z neznámej hodnoty na načítanú vyberie správny riadok', () => {
    const { rerender } = renderSection(null, true);

    rerender(
      <Section
        title="Sekcia"
        description="Popis"
        value
        setValue={jest.fn()}
        offLabel="Vypnuté"
        onLabel="Zapnuté"
        desktop
      />,
    );

    const box = screen.getByText('Sekcia').closest('div.rounded-lg') as HTMLElement;
    expect(isSelected(within(box).getByRole('button', { name: 'Zapnuté' }))).toBe(true);
  });
});
