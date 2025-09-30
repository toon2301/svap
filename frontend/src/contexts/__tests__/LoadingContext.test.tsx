import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingProvider, useLoading } from '../LoadingContext';

// Test komponenta, ktorá používa useLoading hook
const TestComponent = () => {
  const { isLoading, loadingMessage, startLoading, stopLoading, setLoading } = useLoading();

  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="loading-message">{loadingMessage}</div>
      <button onClick={() => startLoading('Custom loading message')}>
        Start Loading
      </button>
      <button onClick={() => stopLoading()}>
        Stop Loading
      </button>
      <button onClick={() => setLoading(true, 'Set loading message')}>
        Set Loading
      </button>
    </div>
  );
};

describe('LoadingContext', () => {
  it('poskytuje loading stav a funkcie', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Načítavam...');
  });

  it('umožňuje spustiť loading', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Start Loading'));
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Custom loading message');
  });

  it('umožňuje zastaviť loading', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    // Najprv spustíme loading
    act(() => {
      fireEvent.click(screen.getByText('Start Loading'));
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');

    // Potom ho zastavíme
    act(() => {
      fireEvent.click(screen.getByText('Stop Loading'));
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
  });

  it('umožňuje nastaviť loading s vlastnou správou', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Set Loading'));
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Set loading message');
  });

  it('zobrazuje loading overlay keď je loading aktívny', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Start Loading'));
    });

    expect(screen.getByTestId('loading-message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Loading' })).toBeInTheDocument();
  });

  it('nezobrazuje loading overlay keď nie je loading aktívny', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    expect(screen.queryByText('Custom loading message')).not.toBeInTheDocument();
  });

  it('vyhodí chybu ak sa useLoading používa mimo LoadingProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoading must be used within a LoadingProvider');

    consoleError.mockRestore();
  });
});
