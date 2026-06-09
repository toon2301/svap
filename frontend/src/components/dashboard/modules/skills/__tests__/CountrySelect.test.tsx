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

  it('moves focus to the listbox when opened from the trigger', async () => {
    render(<CountrySelect value="SK" onChange={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /krajina/i }));

    const listbox = await screen.findByRole('listbox');
    await waitFor(() => {
      expect(listbox).toHaveFocus();
    });
  });

  it('supports keyboard navigation and selection from the listbox', async () => {
    const onChange = jest.fn();
    render(<CountrySelect value="SK" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /krajina/i }), {
      key: 'ArrowDown',
    });
    const listbox = await screen.findByRole('listbox');
    await waitFor(() => {
      expect(listbox).toHaveFocus();
    });

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('CZ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
