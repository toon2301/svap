import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OfferWatchSearchSelect from './OfferWatchSearchSelect';

type ViewportEvent = 'resize' | 'scroll';

const options = [
  { key: 'first', label: 'Prvá možnosť' },
  { key: 'second', label: 'Druhá možnosť' },
];

function mockInputRect(input: HTMLElement, top: number): void {
  jest.spyOn(input, 'getBoundingClientRect').mockReturnValue({
    x: 40,
    y: top,
    top,
    right: 340,
    bottom: top + 44,
    left: 40,
    width: 300,
    height: 44,
    toJSON: () => ({}),
  });
}

function installVisualViewport(initial: {
  width: number;
  height: number;
  offsetTop?: number;
  offsetLeft?: number;
}) {
  let metrics = {
    offsetTop: 0,
    offsetLeft: 0,
    ...initial,
  };
  const listeners = new Map<ViewportEvent, Set<EventListener>>([
    ['resize', new Set()],
    ['scroll', new Set()],
  ]);
  const viewport = {
    get width() {
      return metrics.width;
    },
    get height() {
      return metrics.height;
    },
    get offsetTop() {
      return metrics.offsetTop;
    },
    get offsetLeft() {
      return metrics.offsetLeft;
    },
    addEventListener: jest.fn((type: ViewportEvent, listener: EventListener) => {
      listeners.get(type)?.add(listener);
    }),
    removeEventListener: jest.fn((type: ViewportEvent, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    }),
  };

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  });

  return {
    viewport,
    setMetrics(next: Partial<typeof metrics>) {
      metrics = { ...metrics, ...next };
    },
    dispatch(type: ViewportEvent) {
      listeners.get(type)?.forEach((listener) => listener(new Event(type)));
    },
  };
}

describe('OfferWatchSearchSelect visual viewport', () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');

  afterEach(() => {
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewport);
    } else {
      Reflect.deleteProperty(window, 'visualViewport');
    }
  });

  it('reflows inside the visual viewport when the mobile keyboard moves it', async () => {
    const visualViewport = installVisualViewport({
      width: 390,
      height: 800,
    });
    const user = userEvent.setup();
    const { unmount } = render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    mockInputRect(combobox, 300);
    await user.click(combobox);

    const popup = screen.getByRole('listbox').parentElement as HTMLElement;
    expect(popup).toHaveAttribute('data-placement', 'below');
    expect(popup.style.maxHeight).toBe('304px');

    act(() => {
      visualViewport.setMetrics({ height: 300, offsetTop: 200 });
      visualViewport.dispatch('resize');
    });
    expect(popup).toHaveAttribute('data-placement', 'below');
    expect(popup.style.top).toBe('344px');
    expect(popup.style.maxHeight).toBe('140px');

    act(() => {
      visualViewport.setMetrics({ offsetTop: 220 });
      visualViewport.dispatch('scroll');
    });
    expect(popup.style.maxHeight).toBe('160px');

    unmount();
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
  });

  it('never forces a minimum height beyond the visible space', async () => {
    installVisualViewport({ width: 390, height: 220 });
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    mockInputRect(combobox, 80);
    await user.click(combobox);

    const popup = screen.getByRole('listbox').parentElement as HTMLElement;
    expect(popup).toHaveAttribute('data-placement', 'below');
    expect(popup.style.maxHeight).toBe('80px');
  });
});
