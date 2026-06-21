import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PortfolioImageDeleteConfirmDialog } from '../PortfolioImageDeleteConfirmDialog';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

function renderDialog(props: Partial<React.ComponentProps<typeof PortfolioImageDeleteConfirmDialog>> = {}) {
  return render(
    <PortfolioImageDeleteConfirmDialog
      open
      onClose={jest.fn()}
      onConfirm={jest.fn()}
      {...props}
    />,
  );
}

describe('PortfolioImageDeleteConfirmDialog – focus trap (BOD 10a)', () => {
  it('Escape zavrie dialóg', () => {
    const onClose = jest.fn();
    renderDialog({ onClose });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Tab na poslednom prvku cyklí späť na prvý (neunikne von)', () => {
    renderDialog();
    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab na prvom prvku cyklí na posledný', () => {
    renderDialog();
    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
