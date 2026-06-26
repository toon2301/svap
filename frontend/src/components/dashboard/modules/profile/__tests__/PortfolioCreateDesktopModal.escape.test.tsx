import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

jest.mock('../portfolioApi', () => ({ createPortfolioItem: jest.fn() }));

jest.mock('../portfolioCreateSubmit', () => ({
  showPortfolioCreateErrors: jest.fn(),
  uploadPortfolioFiles: jest.fn(),
}));

jest.mock('../PortfolioCreatePhotoPicker', () => ({
  PortfolioCreatePhotoPicker: () => null,
}));

jest.mock('../PortfolioCategoryPicker', () => ({
  PortfolioCategoryPicker: () => null,
}));

jest.mock('../PortfolioCreateDiscardConfirm', () => ({
  PortfolioCreateDiscardConfirm: ({
    onKeepEditing,
    onDiscard,
  }: {
    onKeepEditing: () => void;
    onDiscard: () => void;
  }) => (
    <div data-testid="discard-confirm">
      <button type="button" onClick={onKeepEditing}>
        keep
      </button>
      <button type="button" onClick={onDiscard}>
        discard
      </button>
    </div>
  ),
}));

import { PortfolioCreateDesktopModal } from '../PortfolioCreateDesktopModal';

function renderModal(
  props: Partial<React.ComponentProps<typeof PortfolioCreateDesktopModal>> = {},
) {
  return render(
    <PortfolioCreateDesktopModal onCancel={jest.fn()} onCreated={jest.fn()} {...props} />,
  );
}

describe('PortfolioCreateDesktopModal – Escape handling (BOD 10B)', () => {
  it('Escape with a clean draft closes the modal (onCancel)', () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('discard-confirm')).not.toBeInTheDocument();
  });

  it('Escape opens discard confirm when dirty, and a second Escape closes only the confirm', () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });

    // Urob draft "dirty" – napíš názov.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Môj projekt' } });

    // Prvý Escape → otvorí discard confirm (nezatvorí modal).
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    // Druhý Escape → zatvorí LEN discard confirm, modal ostáva otvorený.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('discard-confirm')).not.toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    // Modal je stále otvorený – znova vidíme krok s názvom (textbox).
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
