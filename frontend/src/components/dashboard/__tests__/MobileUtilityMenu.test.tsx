import { fireEvent, render, screen } from '@testing-library/react';

import { ThemeProvider } from '@/contexts/ThemeContext';

import MobileUtilityMenu from '../MobileUtilityMenu';

function renderMenu(
  onLogout = jest.fn(),
  onBugReportOpen = jest.fn(),
) {
  render(
    <ThemeProvider>
      <MobileUtilityMenu
        onBugReportOpen={onBugReportOpen}
        onLogout={onLogout}
      />
    </ThemeProvider>,
  );
  return { onBugReportOpen, onLogout };
}

describe('MobileUtilityMenu', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('opens a mobile bottom sheet with the shared actions', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));

    expect(screen.getByRole('dialog', { name: 'Viac' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Nahlásiť problém' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Tmavý režim' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Odhlásiť sa' })).toBeInTheDocument();
  });

  it('closes the navigation and requests the bug report dialog', () => {
    const onBugReportRequest = jest.fn();
    window.addEventListener('svaply:bug-report-dialog-request', onBugReportRequest);
    const { onBugReportOpen } = renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));

    fireEvent.click(screen.getByRole('menuitem', { name: 'Nahlásiť problém' }));

    expect(onBugReportOpen).toHaveBeenCalledTimes(1);
    expect(onBugReportRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Viac' })).not.toBeInTheDocument();
    window.removeEventListener('svaply:bug-report-dialog-request', onBugReportRequest);
  });

  it('closes from the close button, backdrop and downward swipe', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Viac' });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Zatvoriť' }));
    expect(screen.queryByRole('dialog', { name: 'Viac' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    const backdrop = screen.getByRole('dialog', { name: 'Viac' }).parentElement;
    fireEvent.mouseDown(backdrop!);
    expect(screen.queryByRole('dialog', { name: 'Viac' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const sheet = screen.getByRole('dialog', { name: 'Viac' });
    fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(sheet, { changedTouches: [{ clientY: 180 }] });
    expect(screen.queryByRole('dialog', { name: 'Viac' })).not.toBeInTheDocument();
  });

  it('changes theme and delegates logout', () => {
    const { onLogout } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Viac' });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tmavý režim' }));
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Odhlásiť sa' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
