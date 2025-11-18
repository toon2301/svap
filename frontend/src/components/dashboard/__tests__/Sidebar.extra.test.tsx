import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

// framer-motion mocked globally in jest.setup

describe('Sidebar extra coverage', () => {
  const onItemClick = jest.fn();
  const onClose = jest.fn();
  const onLanguageClick = jest.fn();
  const onAccountTypeClick = jest.fn();
  const onLogout = jest.fn();

  const baseProps = {
    activeItem: 'home',
    onItemClick,
    onLogout,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles theme button label', () => {
    render(
      <ThemeProvider>
        <Sidebar {...baseProps} />
      </ThemeProvider>
    );

    // Initial light theme → shows "Tmavý režim" text, button is labeled by aria-label
    const themeBtn = screen.getByRole('button', { name: /prepínač témy/i });
    expect(screen.getByText(/tmavý režim/i)).toBeInTheDocument();

    fireEvent.click(themeBtn);

    // After toggle to dark → shows "Svetlý režim"
    expect(screen.getByText(/svetlý režim/i)).toBeInTheDocument();
  });

  it('mobile: language row triggers onLanguageClick and closes', () => {
    render(
      <ThemeProvider>
        <Sidebar
          {...baseProps}
          isMobile
          isOpen
          onClose={onClose}
          onLanguageClick={onLanguageClick}
        />
      </ThemeProvider>
    );

    const languageRow = screen.getByText('Jazyk').closest('button')!;
    fireEvent.click(languageRow);

    expect(onLanguageClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('mobile: account type row triggers onAccountTypeClick and closes', () => {
    render(
      <ThemeProvider>
        <Sidebar
          {...baseProps}
          isMobile
          isOpen
          onClose={onClose}
          onAccountTypeClick={onAccountTypeClick}
        />
      </ThemeProvider>
    );

    const accRow = screen.getByText('Účet').closest('button')!;
    fireEvent.click(accRow);

    expect(onAccountTypeClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('mobile: notifications row triggers onItemClick', () => {
    render(
      <ThemeProvider>
        <Sidebar
          {...baseProps}
          isMobile
          isOpen
          onClose={onClose}
        />
      </ThemeProvider>
    );

    const notifRow = screen.getByText('Upozornenia').closest('button')!;
    fireEvent.click(notifRow);

    expect(onItemClick).toHaveBeenCalledWith('notifications');
  });
});


