import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchMobilePickerScreen from './OfferWatchMobilePickerScreen';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

const OPTIONS = [
  { key: '', label: 'Všetky okresy' },
  { key: 'bratislava-i', label: 'Bratislava I', searchText: 'Staré Mesto' },
  { key: 'zilina', label: 'Žilina' },
];

function renderPicker(overrides: Partial<React.ComponentProps<typeof OfferWatchMobilePickerScreen>> = {}) {
  const props: React.ComponentProps<typeof OfferWatchMobilePickerScreen> = {
    title: 'Okres',
    searchPlaceholder: 'Vyhľadaj okres',
    emptyMessage: 'Nenašiel sa žiadny okres.',
    options: OPTIONS,
    selectedKey: 'zilina',
    onBack: jest.fn(),
    onSelect: jest.fn(),
    ...overrides,
  };
  render(<OfferWatchMobilePickerScreen {...props} />);
  return props;
}

describe('OfferWatchMobilePickerScreen', () => {
  it('keeps the header and search fixed while only the flat option list scrolls', () => {
    renderPicker();

    const search = screen.getByRole('searchbox', { name: 'Vyhľadaj okres' });
    const list = screen.getByTestId('offer-watch-mobile-picker-list');

    expect(screen.getByRole('heading', { name: 'Okres' })).toBeInTheDocument();
    expect(list).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(list.parentElement).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');
    expect(list.parentElement?.parentElement).toHaveClass('overflow-hidden');
    expect(search.closest('.overflow-y-auto')).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(screen.getAllByRole('option')[0]).toHaveClass('border-b');
  });

  it('marks the selected row and applies a tapped option', () => {
    const props = renderPicker();

    expect(screen.getByRole('option', { name: 'Žilina' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'Bratislava I' }));

    expect(props.onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it('filters diacritic-insensitively and supports an alias', () => {
    renderPicker();
    const search = screen.getByRole('searchbox', { name: 'Vyhľadaj okres' });

    fireEvent.change(search, { target: { value: 'zil' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Žilina' })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'stare mesto' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Bratislava I' })).toBeInTheDocument();
  });

  it('deduplicates identical canonical keys without hiding distinct choices', () => {
    renderPicker({
      options: [
        OPTIONS[1],
        { ...OPTIONS[1], label: 'Starý duplicitný názov' },
        { key: 'bratislava-ii', label: 'Bratislava I' },
      ],
      selectedKey: '',
    });

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByText('Starý duplicitný názov')).not.toBeInTheDocument();
    expect(screen.getAllByText('Bratislava I')).toHaveLength(2);
  });

  it('does not render the large category list before a query and reports no results', () => {
    renderPicker({
      requireQuery: true,
      startTypingMessage: 'Začni písať.',
    });

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Začni písať.');
    expect(screen.getByRole('listbox')).not.toContainElement(screen.getByRole('status'));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nič také' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Nenašiel sa žiadny okres.');
  });

  it('moves from search to the first result with ArrowDown and selects a sole result with Enter', () => {
    const props = renderPicker();
    const search = screen.getByRole('searchbox');

    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveFocus();

    fireEvent.change(search, { target: { value: 'Žilina' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(props.onSelect).toHaveBeenCalledWith(OPTIONS[2]);
  });

  it('supports complete arrow, Home and End navigation inside the option list', () => {
    renderPicker({ selectedKey: '' });
    const search = screen.getByRole('searchbox');
    const options = screen.getAllByRole('option');

    fireEvent.keyDown(search, { key: 'ArrowUp' });
    expect(options[2]).toHaveFocus();
    expect(options[2]).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(options[2], { key: 'ArrowDown' });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(options[0], { key: 'End' });
    expect(options[2]).toHaveFocus();

    fireEvent.keyDown(options[2], { key: 'Home' });
    expect(options[0]).toHaveFocus();
    expect(options[0]).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(options[0], { key: 'ArrowUp' });
    expect(options[2]).toHaveFocus();
  });

  it('accepts only the first tap while navigation back is pending', () => {
    const props = renderPicker();
    const option = screen.getByRole('option', { name: 'Bratislava I' });

    fireEvent.click(option);
    fireEvent.click(option);

    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it('uses the standard back control without changing a selection', () => {
    const props = renderPicker();

    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));

    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onSelect).not.toHaveBeenCalled();
  });
});
