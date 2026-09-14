import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OfferWatchSearchSelect from './OfferWatchSearchSelect';

const options = [
  { key: 'first', label: 'Prvá možnosť' },
  { key: 'second', label: 'Druhá možnosť', secondaryLabel: 'Skupina' },
];

describe('OfferWatchSearchSelect non-searchable mode', () => {
  it('shows every option and prevents text entry', async () => {
    const user = userEvent.setup();
    render(
      <OfferWatchSearchSelect
        id='currency-picker'
        label='Mena'
        valueKey='second'
        valueLabel='Druhá možnosť'
        placeholder='Vyber menu'
        searchPlaceholder='Hľadaj menu'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={jest.fn()}
        requireQuery
        readOnly
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    expect(combobox).toHaveAttribute('readonly');
    expect(combobox).toHaveAttribute('aria-autocomplete', 'none');

    await user.click(combobox);
    expect(screen.getAllByRole('option')).toHaveLength(options.length);
    expect(screen.getByRole('option', { name: /Druhá možnosť/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.type(combobox, 'neprepíš');
    expect(combobox).toHaveValue('Druhá možnosť');
    expect(screen.getAllByRole('option')).toHaveLength(options.length);
  });

  it('supports Arrow, Home, End, Enter, Space, and Escape keys', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <OfferWatchSearchSelect
        id='currency-picker'
        label='Mena'
        valueKey='second'
        valueLabel='Druhá možnosť'
        placeholder='Vyber menu'
        searchPlaceholder='Hľadaj menu'
        emptyMessage='Nič sa nenašlo'
        options={options}
        onSelect={onSelect}
        readOnly
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    await user.click(combobox);
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('data-active', 'true');

    await user.keyboard('{Home}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(options[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();

    await user.keyboard(' ');
    await user.keyboard('{End} ');
    expect(onSelect).toHaveBeenLastCalledWith(options[1]);

    await user.keyboard('{ArrowDown}{ArrowUp}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it('closes on Tab and outside pointer interaction', async () => {
    const user = userEvent.setup();
    render(
      <>
        <OfferWatchSearchSelect
          id='currency-picker'
          label='Mena'
          valueKey=''
          valueLabel=''
          placeholder='Vyber menu'
          searchPlaceholder='Hľadaj menu'
          emptyMessage='Nič sa nenašlo'
          options={options}
          onSelect={jest.fn()}
          readOnly
        />
        <button type='button'>Ďalší prvok</button>
      </>,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    const nextButton = screen.getByRole('button', { name: 'Ďalší prvok' });
    await user.click(combobox);
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(nextButton).toHaveFocus();

    await user.click(combobox);
    await user.click(nextButton);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
