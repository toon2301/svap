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
    await user.click(screen.getByRole('button', { name: 'Výber' }));
    const list = screen.getByRole('listbox');
    const popup = list.parentElement as HTMLElement;
    return { list, popup };
  }

  it('caps the height on the popup only, never on the list itself', async () => {
    const { list, popup } = await openPopup();

    // Strop patrí VÝHRADNE vonkajšiemu okienku…
    expect(popup.style.maxHeight).not.toBe('');
    expect(popup.className).toContain('overflow-hidden');
    // …zoznam si ten istý strop nesmie zobrať druhýkrát: potom by spolu
    // s pevnou hlavičkou presiahol okienko a spodok by sa odrezal.
    expect(list.style.maxHeight).toBe('');
  });

  it('gives the list the space left after the search header', async () => {
    const { list, popup } = await openPopup();

    // Okienko je ohraničený flex stĺpec…
    expect(popup.className).toContain('flex');
    expect(popup.className).toContain('flex-col');
    // …hlavička si drží svoju výšku…
    const header = popup.firstElementChild as HTMLElement;
    expect(header.className).toContain('shrink-0');
    expect(header).toContainElement(screen.getByRole('combobox', { name: 'Hľadaj' }));
    // …a zoznam dostane presne zvyšok (`min-h-0` ruší automatické minimum
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
