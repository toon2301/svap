import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CountrySelect from '../skillDescriptionModal/CountrySelect';

describe('CountrySelect', () => {
  let requestAnimationFrameSpy: jest.SpyInstance<number, [FrameRequestCallback]>;

  beforeEach(() => {
    requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
  });

  it('moves focus to the searchable combobox when opened from the trigger', async () => {
    render(<CountrySelect value="SK" onChange={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /krajina/i }));

    const combobox = await screen.findByRole('combobox');
    await waitFor(() => {
      expect(combobox).toHaveFocus();
    });
  });

  it('filters and selects any registered country with the keyboard', async () => {
    const onChange = jest.fn();
    render(<CountrySelect value="SK" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /krajina/i }), {
      key: 'ArrowDown',
    });
    const combobox = await screen.findByRole('combobox');
    await waitFor(() => {
      expect(combobox).toHaveFocus();
    });

    fireEvent.change(combobox, { target: { value: 'IT' } });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('IT');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes with Escape and restores focus to the trigger', async () => {
    render(<CountrySelect value="US" onChange={jest.fn()} />);
    const trigger = screen.getByRole('button', { name: /krajina/i });

    fireEvent.click(trigger);
    const combobox = await screen.findByRole('combobox');
    fireEvent.keyDown(combobox, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
