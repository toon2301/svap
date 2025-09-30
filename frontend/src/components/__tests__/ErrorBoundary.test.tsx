import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Komponenta, ktorá vyvolá chybu
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Potlačenie console.error pre testy
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('zobrazuje deti keď nie je chyba', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('zobrazuje error UI keď je chyba', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Niečo sa pokazilo')).toBeInTheDocument();
    expect(screen.getByText('Došlo k neočakávanej chybe. Skúste obnoviť stránku alebo sa vráťte na hlavnú stránku.')).toBeInTheDocument();
  });

  it('zobrazuje tlačidlá pre akcie', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Skúsiť znovu')).toBeInTheDocument();
    expect(screen.getByText('Domov')).toBeInTheDocument();
  });

  it('umožňuje retry po chybe', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Niečo sa pokazilo')).toBeInTheDocument();

    // Klik na retry tlačidlo
    fireEvent.click(screen.getByText('Skúsiť znovu'));

    // Rerender s ThrowError shouldThrow={false}
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('zobrazuje technické detaily v development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Technické detaily (len pre vývojárov)')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('nezobrazuje technické detaily v production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Technické detaily (len pre vývojárov)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('používa vlastný fallback keď je poskytnutý', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Niečo sa pokazilo')).not.toBeInTheDocument();
  });
});
