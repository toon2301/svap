import { render, screen, act } from '@testing-library/react';
import OfflineIndicator from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('nezobrazuje banner, keď je online', () => {
    render(<OfflineIndicator />);
    expect(screen.queryByText(/Offline režim/)).not.toBeInTheDocument();
  });

  it('zobrazí banner, keď je offline a schová po návrate online', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    render(<OfflineIndicator />);

    expect(screen.getByText(/Offline režim/)).toBeInTheDocument();

    // prepni na online a po 3s sa skryje
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/Offline režim/)).not.toBeInTheDocument();
  });

  it('registruje a odregisruje event listener-y', () => {
    const { unmount } = render(<OfflineIndicator />);
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});


