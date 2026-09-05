import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OfferWatchSearchSelect from './OfferWatchSearchSelect';

const options = [
  { key: 'first', label: 'Prvá možnosť' },
  { key: 'second', label: 'Druhá možnosť', secondaryLabel: 'Skupina' },
];

describe('OfferWatchSearchSelect', () => {
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

    const trigger = screen.getByRole('button', { name: 'Výber' });
    await user.click(trigger);
    const search = screen.getByRole('combobox', { name: 'Hľadaj' });
    await user.type(search, 'dru');
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[1]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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

    const trigger = screen.getByRole('button', { name: 'Výber' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
