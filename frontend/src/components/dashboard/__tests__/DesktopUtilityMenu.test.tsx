import { fireEvent, render, screen } from '@testing-library/react';

import { ThemeProvider } from '@/contexts/ThemeContext';

import DesktopUtilityMenu from '../DesktopUtilityMenu';

function renderMenu(onLogout = jest.fn()) {
  render(
    <ThemeProvider>
      <DesktopUtilityMenu onLogout={onLogout} />
    </ThemeProvider>,
  );
  return onLogout;
}

describe('DesktopUtilityMenu', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('opens upward utility actions from the More button', () => {
    renderMenu();

    expect(screen.queryByRole('group', { name: 'Viac' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));

    expect(screen.getByRole('group', { name: 'Viac' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nahlásiť problém' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tmavý režim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odhlásiť sa' })).toBeInTheDocument();
  });

  it('opens the existing bug report dialog request and closes the menu', () => {
    const onBugReportRequest = jest.fn();
    window.addEventListener('svaply:bug-report-dialog-request', onBugReportRequest);
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));

    fireEvent.click(screen.getByRole('button', { name: 'Nahlásiť problém' }));

    expect(onBugReportRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'Viac' })).not.toBeInTheDocument();
    window.removeEventListener('svaply:bug-report-dialog-request', onBugReportRequest);
  });

  it('changes theme and delegates logout', () => {
    const onLogout = renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tmavý režim' }));
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));
    fireEvent.click(screen.getByRole('button', { name: 'Odhlásiť sa' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and restores focus to the trigger', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Viac' });
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('group', { name: 'Viac' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes after a click outside', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Viac' }));

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('group', { name: 'Viac' })).not.toBeInTheDocument();
  });
});
