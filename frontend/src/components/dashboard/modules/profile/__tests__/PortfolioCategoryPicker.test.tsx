import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PortfolioCategoryPicker } from '../PortfolioCategoryPicker';
import { PORTFOLIO_CATEGORY_OPTIONS } from '../portfolioFormUtils';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

function renderPicker(
  props: Partial<React.ComponentProps<typeof PortfolioCategoryPicker>> = {},
) {
  return render(
    <PortfolioCategoryPicker
      value=""
      onChange={jest.fn()}
      label="Kategória"
      placeholder="Vyber"
      {...props}
    />,
  );
}

function openAndGetOptions(
  props: Partial<React.ComponentProps<typeof PortfolioCategoryPicker>> = {},
) {
  renderPicker(props);
  fireEvent.click(screen.getByRole('button'));
  return screen.getAllByRole('option');
}

describe('PortfolioCategoryPicker – keyboard navigation (BOD 9A)', () => {
  it('focuses the first option on open', () => {
    const options = openAndGetOptions();
    expect(options).toHaveLength(PORTFOLIO_CATEGORY_OPTIONS.length);
    expect(document.activeElement).toBe(options[0]);
  });

  it('ArrowDown / ArrowUp move focus between options', () => {
    const options = openAndGetOptions();
    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(options[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('wraps from last to first on ArrowDown', () => {
    const options = openAndGetOptions();
    const last = options[options.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('wraps from first to last on ArrowUp', () => {
    const options = openAndGetOptions();
    options[0].focus();
    fireEvent.keyDown(options[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[options.length - 1]);
  });

  it('Home / End jump to first / last option', () => {
    const options = openAndGetOptions();
    fireEvent.keyDown(options[0], { key: 'End' });
    expect(document.activeElement).toBe(options[options.length - 1]);
    fireEvent.keyDown(options[options.length - 1], { key: 'Home' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('Escape closes the listbox and returns focus to the trigger', () => {
    const options = openAndGetOptions();
    const trigger = screen.getByRole('button');
    fireEvent.keyDown(options[0], { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('selecting an option (click) calls onChange and closes', () => {
    const onChange = jest.fn();
    const options = openAndGetOptions({ onChange });
    fireEvent.click(options[2]);
    expect(onChange).toHaveBeenCalledWith(PORTFOLIO_CATEGORY_OPTIONS[2]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('PortfolioCategoryPicker – scroll handling (BOD 9B)', () => {
  it('ignores scroll inside the dropdown but repositions on page scroll', () => {
    renderPicker();
    const trigger = screen.getByRole('button');
    let bottom = 100;
    trigger.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom,
        left: 0,
        right: 200,
        width: 200,
        height: bottom - 100,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(listbox.style.top).toBe('108px');

    bottom = 200; // button moved (e.g. layout shift)

    // Scroll vnútri dropdownu (target je listbox) → žiadny prepočet pozície.
    fireEvent.scroll(listbox);
    expect(listbox.style.top).toBe('108px');

    // Scroll stránky → pozícia sa prepočíta.
    fireEvent.scroll(window);
    expect(listbox.style.top).toBe('208px');
  });
});
