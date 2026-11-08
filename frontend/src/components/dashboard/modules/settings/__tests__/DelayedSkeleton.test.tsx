import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DelayedSkeleton from '../DelayedSkeleton';

/**
 * Obal kostry sekcií Nastavení (nález 286): kostra je v DOM od prvého snímku, no prvých 200 ms je neviditeľná
 * (drží svoje miesto), takže rýchla odpoveď kostru nikdy neukáže a rozloženie sa nehýbe.
 */
describe('DelayedSkeleton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Posunie hodiny o `ms` v `act`. */
  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  const renderSkeleton = (props: Partial<React.ComponentProps<typeof DelayedSkeleton>> = {}) =>
    render(
      <DelayedSkeleton isLoading label="Načítavam..." {...props}>
        <div data-testid="shape">tvar kostry</div>
      </DelayedSkeleton>,
    );

  it('bez načítavania nevykreslí nič', () => {
    const { container } = renderSkeleton({ isLoading: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('má stavový región s aria-busy a textom pre čítače obrazovky', () => {
    renderSkeleton();

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Načítavam...');
    expect(screen.getByText('Načítavam...')).toHaveClass('sr-only');
  });

  it('kostra je od začiatku v DOM, prvých 200 ms neviditeľná a pre čítače skrytá', () => {
    renderSkeleton();

    const shape = screen.getByTestId('shape');
    expect(shape.parentElement).toHaveClass('invisible');
    expect(shape.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('delayed-skeleton')).toHaveAttribute('data-visible', 'false');

    advance(199);
    expect(shape.parentElement).toHaveClass('invisible');
  });

  it('po 200 ms sa kostra ukáže a pulzuje', () => {
    renderSkeleton();

    advance(200);

    const shape = screen.getByTestId('shape');
    expect(shape.parentElement).not.toHaveClass('invisible');
    expect(shape.parentElement).toHaveClass('animate-pulse');
    expect(screen.getByTestId('delayed-skeleton')).toHaveAttribute('data-visible', 'true');
  });

  it('kostra, ktorá pulzuje sama, sa nepulzuje dvakrát', () => {
    renderSkeleton({ pulse: false });

    advance(200);

    const shape = screen.getByTestId('shape');
    expect(shape.parentElement).not.toHaveClass('invisible');
    expect(shape.parentElement).not.toHaveClass('animate-pulse');
  });

  it('berie vlastné oneskorenie a vlastné data-testid', () => {
    renderSkeleton({ delayMs: 50, testId: 'moja-kostra' });

    advance(49);
    expect(screen.getByTestId('moja-kostra')).toHaveAttribute('data-visible', 'false');
    advance(1);
    expect(screen.getByTestId('moja-kostra')).toHaveAttribute('data-visible', 'true');
  });

  it('keď načítavanie skončí, región aj kostra zmiznú', () => {
    const { rerender } = renderSkeleton();
    advance(300);

    rerender(
      <DelayedSkeleton isLoading={false} label="Načítavam...">
        <div data-testid="shape">tvar kostry</div>
      </DelayedSkeleton>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shape')).not.toBeInTheDocument();
  });
});
