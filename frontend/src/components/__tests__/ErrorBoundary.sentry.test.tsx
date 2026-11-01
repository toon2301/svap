/**
 * ErrorBoundary hlási chyby vykresľovania do Sentry (nález 33).
 *
 * Chyba zachytená hranicou sa do Sentry sama nedostane, preto ju hranica hlási v `componentDidCatch`.
 * Zvyšok správania hranice je v `ErrorBoundary.test.tsx`.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as Sentry from '@sentry/nextjs';
import ErrorBoundary from '../ErrorBoundary';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

const Boom = ({ message = 'chyba vykresľovania' }: { message?: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary a Sentry', () => {
  beforeEach(() => {
    captureException.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('nahlási zachytenú chybu vykresľovania aj s vetvou komponentov', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, hint] = captureException.mock.calls[0];
    expect((error as Error).message).toBe('chyba vykresľovania');
    // Presný zápis zásobníka závisí od verzie Reactu; podstatné je, že sa pripojil a opisuje vetvu komponentov.
    expect(hint.contexts.react.componentStack).toEqual(expect.stringContaining('ErrorBoundary'));
  });

  it('bez chyby nič nehlási', () => {
    render(
      <ErrorBoundary>
        <div>všetko v poriadku</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('všetko v poriadku')).toBeInTheDocument();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('zlyhanie hlásenia nerozbije chybovú stránku', () => {
    captureException.mockImplementation(() => {
      throw new Error('Sentry nie je dostupný');
    });

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Oops! Niečo sa pokazilo')).toBeInTheDocument();
  });

  it('s vlastným fallbackom chybu tiež nahlási', () => {
    render(
      <ErrorBoundary fallback={<div>vlastná chyba</div>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('vlastná chyba')).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
