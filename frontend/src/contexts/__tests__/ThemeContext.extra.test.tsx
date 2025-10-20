import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from '../ThemeContext';

function Consumer() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
    </div>
  );
}

describe('ThemeContext extra coverage', () => {
  const originalMatchMedia = window.matchMedia;
  const originalSetItem = window.localStorage.setItem;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.localStorage.setItem = originalSetItem;
    document.documentElement.classList.remove('dark');
  });

  it('initializes from system preference and toggles correctly', () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as any;

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(screen.getByText('dark'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('gracefully handles localStorage.setItem errors', () => {
    window.localStorage.setItem = (() => { throw new Error('quota'); }) as any;

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('dark'));
    // still applies class despite storage failure
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('throws when useTheme is used outside provider', () => {
    const Outside = () => {
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useTheme();
      } catch (e) {
        return <div>thrown</div>;
      }
      return null;
    };

    render(<Outside />);
    expect(screen.getByText('thrown')).toBeInTheDocument();
  });
});

