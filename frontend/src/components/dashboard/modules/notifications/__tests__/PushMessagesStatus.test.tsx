import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import PushMessagesStatus from '../PushMessagesStatus';

/**
 * Stavový riadok pod voľbou Správy (nález 286): riadok je v DOM vždy a drží výšku, takže text „Načítavam…“ sa v ňom
 * objaví a zmizne bez posunu sekcií pod ním, a ukáže sa až po 200 ms.
 */
describe('PushMessagesStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  const statusLine = () => screen.getByTestId('notifications-push-status');

  it('riadok je v DOM aj bez načítavania, je prázdny a drží výšku jedného riadka', () => {
    render(<PushMessagesStatus loading={false} loadingLabel="Načítavam..." error={null} />);

    expect(statusLine()).toBeEmptyDOMElement();
    expect(statusLine()).toHaveClass('min-h-4', 'mt-2', 'text-xs');
    expect(statusLine()).toHaveAttribute('role', 'status');
  });

  it('text načítavania sa ukáže až po 200 ms a po skončení hneď zmizne', () => {
    const { rerender } = render(
      <PushMessagesStatus loading loadingLabel="Načítavam..." error={null} />,
    );

    expect(statusLine()).toBeEmptyDOMElement();
    advance(199);
    expect(statusLine()).toBeEmptyDOMElement();
    advance(1);
    expect(statusLine()).toHaveTextContent('Načítavam...');

    rerender(<PushMessagesStatus loading={false} loadingLabel="Načítavam..." error={null} />);
    expect(statusLine()).toBeEmptyDOMElement();
  });

  it('krátka kontrola (pod 200 ms) text neukáže vôbec', () => {
    const { rerender } = render(
      <PushMessagesStatus loading loadingLabel="Načítavam..." error={null} />,
    );
    advance(150);

    rerender(<PushMessagesStatus loading={false} loadingLabel="Načítavam..." error={null} />);
    advance(1000);

    expect(statusLine()).toBeEmptyDOMElement();
  });

  it('počas úvodného načítania text neukáže ani po dlhšom čase, to ukazuje kostra voľby', () => {
    render(<PushMessagesStatus loading initialLoading loadingLabel="Načítavam..." error={null} />);

    advance(2000);

    expect(statusLine()).toBeEmptyDOMElement();
  });

  it('po skončení úvodného načítania sa čas počíta odznova, kým kontrola prehliadača trvá', () => {
    const { rerender } = render(
      <PushMessagesStatus loading initialLoading loadingLabel="Načítavam..." error={null} />,
    );
    advance(500);

    rerender(<PushMessagesStatus loading initialLoading={false} loadingLabel="Načítavam..." error={null} />);
    advance(199);
    expect(statusLine()).toBeEmptyDOMElement();
    advance(1);
    expect(statusLine()).toHaveTextContent('Načítavam...');
  });

  it('riadok sa pri zmene stavu nevymení za nový prvok, takže sa nič neposunie', () => {
    const { rerender } = render(
      <PushMessagesStatus loading={false} loadingLabel="Načítavam..." error={null} />,
    );
    const before = statusLine();

    rerender(<PushMessagesStatus loading loadingLabel="Načítavam..." error={null} />);
    advance(300);
    expect(statusLine()).toBe(before);

    rerender(<PushMessagesStatus loading={false} loadingLabel="Načítavam..." error="Chyba" />);
    expect(statusLine()).toBe(before);
  });

  it('chyba je samostatný riadok pod stavovým riadkom a bez chyby nie je v DOM', () => {
    const { rerender } = render(
      <PushMessagesStatus loading={false} loadingLabel="Načítavam..." error={null} />,
    );
    expect(screen.queryByText('Push je zablokovaný.')).not.toBeInTheDocument();

    rerender(
      <PushMessagesStatus loading={false} loadingLabel="Načítavam..." error="Push je zablokovaný." />,
    );

    const error = screen.getByText('Push je zablokovaný.');
    expect(error).toHaveClass('text-red-600', 'mt-2');
    expect(error).not.toHaveAttribute('role', 'status');
    expect(statusLine()).toBeEmptyDOMElement();
    expect(statusLine().nextElementSibling).toBe(error);
  });

  it('chyba sa pridá do stránky až po zlyhaní, preto je to upozornenie, ktoré čítač obrazovky oznámi', () => {
    const { rerender } = render(
      <PushMessagesStatus loading={false} loadingLabel="Načítavam..." error={null} />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <PushMessagesStatus loading={false} loadingLabel="Načítavam..." error="Push je zablokovaný." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Push je zablokovaný.');
    // Stavový riadok „Načítavam…“ ostáva zdvorilý stavový región, nie upozornenie.
    expect(statusLine()).toHaveAttribute('role', 'status');
    expect(statusLine()).not.toHaveAttribute('role', 'alert');
  });

  it('chyba sa vloží s krátkym prechodom, nie skokom', () => {
    render(
      <PushMessagesStatus loading={false} loadingLabel="Načítavam..." error="Push je zablokovaný." />,
    );

    expect(screen.getByText('Push je zablokovaný.')).toHaveClass('animate-content-in');
  });
});
