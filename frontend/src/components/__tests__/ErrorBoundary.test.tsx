import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    jest.restoreAllMocks();
  });

  it('zobrazuje deti ked nie je chyba', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('zobrazuje error UI ked je chyba', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Oops! NieÄo sa pokazilo')).toBeInTheDocument();
    expect(
      screen.getByText(
        'DoÅ¡lo k neoÄakÃ¡vanej chybe. SkÃºste obnoviÅ¥ strÃ¡nku alebo sa vrÃ¡Å¥te na hlavnÃº strÃ¡nku.',
      ),
    ).toBeInTheDocument();
  });

  it('zobrazuje tlacidla pre akcie', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('SkÃºsiÅ¥ znovu')).toBeInTheDocument();
    expect(screen.getByText('Domov')).toBeInTheDocument();
  });

  it('umoznuje retry po chybe', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Oops! NieÄo sa pokazilo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('SkÃºsiÅ¥ znovu'));

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('zobrazuje technicke detaily v development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('TechnickÃ© detaily (len pre vÃ½vojÃ¡rov)')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('nezobrazuje technicke detaily v production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.queryByText('TechnickÃ© detaily (len pre vÃ½vojÃ¡rov)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('pouziva vlastny fallback ked je poskytnuty', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Oops! NieÄo sa pokazilo')).not.toBeInTheDocument();
  });

  it('zobrazi debug copy akciu pri opt-in error debug rezime', async () => {
    window.history.replaceState({}, '', '/dashboard/messages?errorDebug=1');
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText('Kopirovat technicke detaily'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('"errorMessage": "Test error"');
    expect(writeText.mock.calls[0][0]).toContain('"route": "/dashboard/messages?errorDebug=*"');
  });
});
