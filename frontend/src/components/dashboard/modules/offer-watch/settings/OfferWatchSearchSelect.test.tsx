import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OfferWatchSearchSelect from './OfferWatchSearchSelect';

const options = [
  { key: 'first', label: 'Prvá možnosť' },
  { key: 'second', label: 'Druhá možnosť', secondaryLabel: 'Skupina' },
];

const optionsWithDuplicateKey = [
  options[0],
  { ...options[0], secondaryLabel: 'Duplicitný zdroj' },
  options[1],
];

const optionsWithSharedLabel = [
  { key: 'first', label: 'Rovnaká možnosť', secondaryLabel: 'Prvá kategória' },
  { key: 'first', label: 'Rovnaká možnosť', secondaryLabel: 'Duplicitná kategória' },
  { key: 'second', label: 'Rovnaká možnosť', secondaryLabel: 'Iná kategória' },
];

function mockInputRect(input: HTMLElement, top: number): void {
  jest.spyOn(input, 'getBoundingClientRect').mockReturnValue({
    x: 40,
    y: top,
    top,
    right: 340,
    bottom: top + 44,
    left: 40,
    width: 300,
    height: 44,
    toJSON: () => ({}),
  });
}

describe('OfferWatchSearchSelect', () => {
  it('keeps the selected value in the same input', async () => {
    const user = userEvent.setup();
    function ControlledSelect() {
      const [selected, setSelected] = useState<(typeof options)[number] | null>(null);
      return (
        <OfferWatchSearchSelect
          id='watch-picker'
          label='Výber'
          valueKey={selected?.key || ''}
          valueLabel={selected?.label || ''}
          placeholder='Vyber'
          searchPlaceholder='Hľadaj'
          emptyMessage='Nič sa nenašlo'
          options={options}
          onSelect={setSelected}
        />
      );
    }
    render(<ControlledSelect />);

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    expect(combobox).toHaveAttribute('type', 'text');
    await user.click(combobox);
    await user.type(combobox, 'dru');
    await user.click(screen.getByRole('option', { name: /Druhá možnosť/ }));

    expect(combobox).toHaveValue('Druhá možnosť');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard selection and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={onSelect}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    await user.click(combobox);
    await user.type(combobox, 'dru');
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[1]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it('closes with Escape without changing the selection', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey='first'
        valueLabel='Prvá možnosť'
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={onSelect}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    await user.click(combobox);
    await user.keyboard('{Escape}');

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
    expect(combobox).toHaveValue('Prvá možnosť');

    await user.click(combobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('does not visually activate the first result until keyboard or pointer navigation', async () => {
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    await user.click(combobox);
    expect(screen.getAllByRole('option').every((option) => !option.hasAttribute('data-active'))).toBe(true);

    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('data-active', 'true');
  });

  it('clears previous results and leaves only the empty state for an invalid query', async () => {
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        startTypingMessage='Začni písať'
        emptyMessage='Nič sa nenašlo'
        options={optionsWithDuplicateKey}
        onSelect={jest.fn()}
        requireQuery
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    await user.click(combobox);
    await user.type(combobox, 'prva');
    expect(screen.getAllByRole('option')).toHaveLength(1);

    await user.clear(combobox);
    await user.type(combobox, 'xyzabc123');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Nič sa nenašlo');
    expect(screen.queryByText('Prvá možnosť')).not.toBeInTheDocument();
  });

  it('deduplicates canonical keys but preserves the same label for distinct keys', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={optionsWithSharedLabel}
        onSelect={onSelect}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    await user.click(combobox);

    const renderedOptions = screen.getAllByRole('option');
    expect(renderedOptions).toHaveLength(2);
    expect(renderedOptions[0]).toHaveAccessibleName(/Prvá kategória/);
    expect(renderedOptions[1]).toHaveAccessibleName(/Iná kategória/);
    expect(screen.queryByText('Duplicitná kategória')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(optionsWithSharedLabel[2]);
  });

  it('keeps only one portalled popup open across multiple fields', async () => {
    const user = userEvent.setup();
    render(
      <>
        <OfferWatchSearchSelect
          id='first-picker'
          label='Prvý výber'
          valueKey=''
          valueLabel=''
          placeholder='Vyber'
          searchPlaceholder='Hľadaj'
          emptyMessage='Nič sa nenašlo'
          options={options}
          onSelect={jest.fn()}
        />
        <OfferWatchSearchSelect
          id='second-picker'
          label='Druhý výber'
          valueKey=''
          valueLabel=''
          placeholder='Vyber'
          searchPlaceholder='Hľadaj'
          emptyMessage='Nič sa nenašlo'
          options={options}
          onSelect={jest.fn()}
        />
      </>,
    );

    await user.click(screen.getByRole('combobox', { name: 'Prvý výber' }));
    await user.click(screen.getByRole('combobox', { name: 'Druhý výber' }));

    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Prvý výber' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('combobox', { name: 'Druhý výber' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('removes its portalled popup when the owning field unmounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Výber' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    unmount();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('joins a popup below the input and shows complete wrapping option labels', async () => {
    const user = userEvent.setup();
    const longLabel = 'South Georgia and the South Sandwich Islands';
    const secondaryLabel = 'A complete secondary description that may wrap';
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={[{ key: 'long', label: longLabel, secondaryLabel }]}
        onSelect={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    mockInputRect(combobox, 100);
    await user.click(combobox);

    const list = screen.getByRole('listbox');
    const popup = list.parentElement as HTMLElement;
    expect(popup).toHaveAttribute('data-placement', 'below');
    expect(popup.style.top).toBe('144px');
    expect(popup.style.width).toBe('300px');
    expect(combobox).toHaveClass('rounded-t-xl', 'rounded-b-none');
    expect(combobox).toHaveClass('border-purple-400');
    expect(combobox).not.toHaveClass('focus:ring-2');
    expect(combobox).toHaveClass('focus-visible:outline-none');
    expect(popup).toHaveClass('rounded-b-xl', 'rounded-t-none', 'border-t-0');
    expect(popup).toHaveClass('border-purple-400');

    const primary = screen.getByText(longLabel);
    const secondary = screen.getByText(secondaryLabel);
    expect(primary).toHaveClass('whitespace-normal', 'break-words');
    expect(secondary).toHaveClass('whitespace-normal', 'break-words');
    expect(primary).not.toHaveClass('truncate');
    expect(secondary).not.toHaveClass('truncate');
  });

  it('keeps an upward popup directly connected to the input', async () => {
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    mockInputRect(combobox, 600);
    await user.click(combobox);

    const popup = screen.getByRole('listbox').parentElement as HTMLElement;
    expect(popup).toHaveAttribute('data-placement', 'above');
    expect(popup.style.top).toBe('600px');
    expect(popup.style.transform).toBe('translateY(-100%)');
    expect(popup.style.width).toBe('300px');
    expect(combobox).toHaveClass('rounded-b-xl', 'rounded-t-none');
    expect(combobox).toHaveClass('border-purple-400');
    expect(combobox).not.toHaveClass('focus:ring-2');
    expect(combobox).toHaveClass('focus-visible:outline-none');
    expect(popup).toHaveClass('rounded-t-xl', 'rounded-b-none', 'border-b-0');
    expect(popup).toHaveClass('border-purple-400');
  });

  it('uses one continuous invalid outline without a trigger-only focus ring', async () => {
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
        invalid
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Výber' });
    await user.click(combobox);
    const popup = screen.getByRole('listbox').parentElement as HTMLElement;

    expect(combobox).toHaveClass('border-red-400');
    expect(combobox).not.toHaveClass('focus:ring-2');
    expect(combobox).toHaveClass('focus-visible:outline-none');
    expect(popup).toHaveClass('border-red-400');
  });

});

describe('výška vysúvacieho okienka', () => {
  /** Dosť možností na to, aby zoznam strop okienka prerástol. */
  const manyOptions = Array.from({ length: 40 }, (_unused, index) => ({
    key: `option-${index}`,
    label: `Možnosť ${index + 1}`,
  }));

  async function openPopup() {
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='watch-picker'
        label='Výber'
        valueKey=''
        valueLabel=''
        placeholder='Vyber'
        searchPlaceholder='Hľadaj'
        emptyMessage='Nič sa nenašlo'
        options={manyOptions}
        onSelect={jest.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Výber' }));
    const list = screen.getByRole('listbox');
    const popup = list.parentElement as HTMLElement;
    return { list, popup };
  }

  it('caps the height on the popup only, never on the list itself', async () => {
    const { list, popup } = await openPopup();

    // Strop patrí VÝHRADNE vonkajšiemu okienku…
    expect(popup.style.maxHeight).not.toBe('');
    expect(popup.className).toContain('overflow-hidden');
    // …zoznam si ten istý strop nesmie zobrať druhýkrát. Vonkajší popup
    // zostáva jediným vlastníkom výškového obmedzenia aj orezania.
    expect(list.style.maxHeight).toBe('');
  });

  it('gives the list the available constrained flex space', async () => {
    const { list, popup } = await openPopup();

    // Okienko je ohraničený flex stĺpec…
    expect(popup.className).toContain('flex');
    expect(popup.className).toContain('flex-col');
    // Zoznam dostane presne dostupný priestor (`min-h-0` ruší automatické minimum
    // flex položky, bez neho by ho obsah roztiahol späť cez okienko).
    expect(list.className).toContain('flex-1');
    expect(list.className).toContain('min-h-0');
    expect(list.className).toContain('overflow-y-auto');
  });

  it('keeps every option inside the one scrollable area', async () => {
    const { list, popup } = await openPopup();

    // Žiadna možnosť sa nestratí…
    const rendered = screen.getAllByRole('option');
    expect(rendered).toHaveLength(manyOptions.length);
    expect(rendered[rendered.length - 1]).toHaveTextContent('Možnosť 40');

    // …a všetky ležia v TOM ISTOM scrollovateľnom uzle, takže sa k nim dá
    // doscrollovať. Predtým zoznam prerastal okienko a jeho spodok skončil
    // za `overflow-hidden`, kam sa scrollovaním nedalo dostať.
    for (const option of rendered) {
      expect(list).toContainElement(option);
    }
    // Scrolluje sa práve jeden uzol – okienko samo nie.
    expect(popup.className).not.toContain('overflow-y-auto');
  });
});
