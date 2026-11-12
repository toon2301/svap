import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import MasterToggle from '../MasterToggle';

/**
 * Stavy hlavného vypínača mimo bežného zapnutia a vypnutia (nález 321, R35): zakázaný vypínač nič nezmení a kým sa
 * hodnota načítava zo servera, nemá polohu (nepravdivé „vypnuté“ by sa po načítaní prehodilo), ale kostru, ktorá sa
 * ukáže až po 200 ms (rovnako ako ostatné kostry Nastavení).
 */
describe('MasterToggle: zakázaný a načítavaný stav', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('zakázaný vypínač je zakázaný a kliknutie nezavolá onChange', () => {
    const onChange = jest.fn();
    render(<MasterToggle enabled={false} onChange={onChange} label="Vypnúť všetko" disabled />);

    const button = screen.getByRole('switch', { name: 'Vypnúť všetko' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('počas načítania je vypínač zakázaný a zaneprázdnený, bez bežca, a kliknutie nič nezmení', () => {
    const onChange = jest.fn();
    render(<MasterToggle enabled={false} onChange={onChange} label="Vypnúť všetko" loading />);

    const button = screen.getByRole('button', { name: 'Vypnúť všetko' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('span')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('kostra je prvých 200 ms neviditeľná (drží miesto) a potom pulzuje', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" loading />);
    const button = screen.getByRole('button', { name: 'Vypnúť všetko' });

    expect(button).toHaveClass('invisible');
    expect(button).not.toHaveClass('animate-pulse');
    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(button).toHaveClass('invisible');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(button).not.toHaveClass('invisible');
    expect(button).toHaveClass('animate-pulse');
  });

  it('neznáma poloha (enabled null, hodnota sa nenačítala): zakázaný vypínač bez bežca a bez pulzu, kliknutie nič nezmení', () => {
    const onChange = jest.fn();
    render(<MasterToggle enabled={null} onChange={onChange} label="Vypnúť všetko" />);

    const button = screen.getByRole('button', { name: 'Vypnúť všetko' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button.querySelector('span')).toBeNull();
    expect(button).not.toHaveClass('bg-purple-400');
    expect(button).not.toHaveClass('animate-pulse');
    expect(button).not.toHaveClass('invisible');
    // Nejde o načítavanie: vypínač nie je zaneprázdnený, len jeho hodnotu nepoznáme.
    expect(button).not.toHaveAttribute('aria-busy');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('testId sa prenesie na tlačidlo vypínača (stabilný selektor pre špecy)', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label="Vypnúť všetko" testId="master" />);

    expect(screen.getByTestId('master')).toBe(screen.getByRole('switch', { name: 'Vypnúť všetko' }));
  });

  it('po načítaní sa vráti bežný vypínač s bežcom v správnej polohe', () => {
    const { rerender } = render(
      <MasterToggle enabled label="Vypnúť všetko" onChange={jest.fn()} loading />,
    );

    rerender(<MasterToggle enabled label="Vypnúť všetko" onChange={jest.fn()} />);

    const button = screen.getByRole('switch', { name: 'Vypnúť všetko' });
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).toHaveClass('bg-purple-400');
    expect(button.querySelector('span')).toHaveClass('left-6');
  });
});
