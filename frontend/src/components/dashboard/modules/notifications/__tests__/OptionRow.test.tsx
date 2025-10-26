import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptionRow from '../OptionRow';

describe('OptionRow', () => {
  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<OptionRow label="Zapnuté" selected={false} onSelect={onSelect} />);
    const btn = screen.getByRole('button', { name: 'Zapnuté' });
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    render(<OptionRow label="Zapnuté" selected={false} onSelect={onSelect} disabled />);
    const btn = screen.getByRole('button', { name: 'Zapnuté' });
    fireEvent.click(btn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows right dot when selected and rightDot enabled', () => {
    render(<OptionRow label="Zapnuté" selected onSelect={() => {}} rightDot />);
    const btn = screen.getByRole('button', { name: 'Zapnuté' });
    // The right dot is the last child div with size classes
    const dot = btn.querySelector('div.w-2.h-2.rounded-full');
    expect(dot).toBeInTheDocument();
  });
});


