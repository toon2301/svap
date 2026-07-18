import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState } from 'react';
import { UnblockUserConfirmDialog } from './UnblockUserConfirmDialog';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      'blockedUsers.confirmTitle': 'Odblokovať používateľa?',
      'blockedUsers.confirmDescription': 'Potvrďte odblokovanie.',
      'blockedUsers.unblock': 'Odblokovať',
      'blockedUsers.unblocking': 'Odblokujem...',
      'common.cancel': 'Zrušiť',
    }[key] || key),
  }),
}));

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>Otvoriť</button>
      <UnblockUserConfirmDialog
        open={open}
        isSubmitting={false}
        onClose={() => setOpen(false)}
        onConfirm={() => undefined}
      />
    </>
  );
}

describe('UnblockUserConfirmDialog', () => {
  it('traps keyboard focus and restores it after closing', () => {
    render(<DialogHarness />);
    const opener = screen.getByRole('button', { name: 'Otvoriť' });
    opener.focus();
    fireEvent.click(opener);

    const cancel = screen.getByRole('button', { name: 'Zrušiť' });
    const confirm = screen.getByRole('button', { name: 'Odblokovať' });
    expect(cancel).toHaveFocus();

    confirm.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    fireEvent.click(cancel);
    expect(opener).toHaveFocus();
  });
});
