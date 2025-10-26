import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MasterToggle from '../MasterToggle';

describe('MasterToggle', () => {
  it('toggles state on click', () => {
    const onChange = jest.fn();
    const { container, rerender } = render(<MasterToggle enabled={false} onChange={onChange} label="Vypnúť všetko" />);
    const button = container.querySelector('button')!;
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<MasterToggle enabled={true} onChange={onChange} label="Vypnúť všetko" />);
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});


