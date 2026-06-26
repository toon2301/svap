import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useModalFocusTrap } from '../useModalFocusTrap';

function Harness({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocusTrap(active, ref);
  return (
    <div>
      <button data-testid="outside">outside</button>
      {active && (
        <div ref={ref} data-testid="modal">
          <button data-testid="first">first</button>
          <button data-testid="mid">mid</button>
          <button data-testid="last">last</button>
        </div>
      )}
    </div>
  );
}

describe('useModalFocusTrap (BOD 10A)', () => {
  it('Tab from last element cycles to first', () => {
    render(<Harness active />);
    screen.getByTestId('last').focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('first'));
  });

  it('Shift+Tab from first element cycles to last', () => {
    render(<Harness active />);
    screen.getByTestId('first').focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByTestId('last'));
  });

  it('does not trap when focus is in the middle (lets Tab proceed)', () => {
    render(<Harness active />);
    screen.getByTestId('mid').focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    // Handler nezasahuje uprostred – fokus ostáva (jsdom Tab fokus nehýbe).
    expect(document.activeElement).toBe(screen.getByTestId('mid'));
  });

  it('restores focus to the previously focused element on deactivate', () => {
    const { rerender } = render(<Harness active={false} />);
    const outside = screen.getByTestId('outside');
    outside.focus();
    expect(document.activeElement).toBe(outside);

    rerender(<Harness active />); // hook si uloží predchádzajúci fokus (outside)
    screen.getByTestId('first').focus();

    rerender(<Harness active={false} />); // cleanup → obnoví fokus
    expect(document.activeElement).toBe(outside);
  });
});
