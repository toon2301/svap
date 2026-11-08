import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import OptionRow from '../OptionRow';
import OptionRowsSkeleton from '../OptionRowsSkeleton';
import ToggleCircle from '../ToggleCircle';

/**
 * Kostra dvojice riadkov „Vypnuté / Zapnuté“ (nález 286): musí mať rovnakú výšku ako skutočné riadky, aby sa pri
 * príchode uloženej voľby nič neposunulo, a ukáže sa až po 200 ms.
 */
describe('OptionRowsSkeleton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('vykreslí dva riadky a medzi nimi zápornú medzeru ako mobilné rozloženie', () => {
    render(<OptionRowsSkeleton label="Načítavam..." />);

    const rows = screen.getAllByTestId('option-rows-skeleton-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId('option-rows-skeleton-gap')).toHaveClass('-mt-1');
  });

  it('hustý variant (desktop) má hustejšie odsadenie a žiadnu zápornú medzeru', () => {
    render(<OptionRowsSkeleton label="Načítavam..." dense />);

    screen.getAllByTestId('option-rows-skeleton-row').forEach((row) => {
      expect(row).toHaveClass('p-2');
      expect(row).not.toHaveClass('p-4');
    });
    expect(screen.getByTestId('option-rows-skeleton-gap')).not.toHaveClass('-mt-1');
  });

  it.each([
    ['mobil', false, 'p-4'],
    ['desktop', true, 'p-2'],
  ])('odsadenie riadkov kostry (%s) je rovnaké ako odsadenie skutočného OptionRow', (_name, dense, padding) => {
    const real = render(
      <OptionRow label="Vypnuté" selected={false} onSelect={jest.fn()} dense={dense} />,
    );
    const realButton = real.getByRole('button');
    expect(realButton).toHaveClass(padding);
    real.unmount();

    render(<OptionRowsSkeleton label="Načítavam..." dense={dense} />);
    screen.getAllByTestId('option-rows-skeleton-row').forEach((row) => {
      expect(row).toHaveClass(padding);
      expect(row).toHaveClass('flex', 'items-center');
    });
  });

  it('kruh kostry má rozmer kruhu ToggleCircle a pruh textu nie je vyšší než riadok textu', () => {
    const circle = render(<ToggleCircle selected={false} />);
    expect(circle.container.firstElementChild).toHaveClass('w-5', 'h-5');
    circle.unmount();

    render(<OptionRowsSkeleton label="Načítavam..." />);
    const row = screen.getAllByTestId('option-rows-skeleton-row')[0];
    const [dot, bar] = Array.from(row.children) as HTMLElement[];
    expect(dot).toHaveClass('h-5', 'w-5', 'mr-3', 'rounded-full');
    // Riadok textu má 20 px (text-sm), pruh 16 px riadok nepredĺži.
    expect(bar).toHaveClass('h-4');
  });

  it('je stavový región s aria-busy a textom pre čítače, kostra je pre čítače skrytá', () => {
    render(<OptionRowsSkeleton label="Načítavam nastavenia..." testId="moja-kostra" />);

    const region = screen.getByTestId('moja-kostra');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Načítavam nastavenia...');
    expect(screen.getAllByTestId('moja-kostra-row')[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('prvých 200 ms je neviditeľná (drží miesto), potom sa ukáže', () => {
    render(<OptionRowsSkeleton label="Načítavam..." />);
    const region = screen.getByTestId('option-rows-skeleton');
    const wrapper = screen.getAllByTestId('option-rows-skeleton-row')[0].closest('[aria-hidden="true"]');

    expect(region).toHaveAttribute('data-visible', 'false');
    expect(wrapper).toHaveClass('invisible');

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(region).toHaveAttribute('data-visible', 'false');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(region).toHaveAttribute('data-visible', 'true');
    expect(wrapper).not.toHaveClass('invisible');
    expect(wrapper).toHaveClass('animate-pulse');
  });
});
