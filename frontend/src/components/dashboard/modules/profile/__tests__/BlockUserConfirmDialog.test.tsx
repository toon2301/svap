import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BlockUserConfirmDialog } from '../BlockUserConfirmDialog';

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open block dialog
      </button>
      <BlockUserConfirmDialog
        open={open}
        isBlocking={false}
        onClose={() => setOpen(false)}
        onConfirm={jest.fn()}
      />
    </>
  );
}

describe('BlockUserConfirmDialog', () => {
  it('traps keyboard focus within the dialog', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open block dialog' }));

    const dialog = screen.getByRole('alertdialog');
    const dialogButtons = within(dialog).getAllByRole('button');
    expect(document.activeElement).toBe(dialogButtons[0]);

    dialogButtons[0].focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(dialogButtons[1]);

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(dialogButtons[0]);
  });

  it('restores focus to the opener after Escape closes the dialog', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open block dialog' });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });
});
