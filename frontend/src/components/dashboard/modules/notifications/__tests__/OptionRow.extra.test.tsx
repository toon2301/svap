import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptionRow from '../OptionRow';

describe('OptionRow extra', () => {
  it('invokes onSelect on pointer down (touch optimization path)', () => {
    const onSelect = jest.fn();
    render(<OptionRow label="Zapnuté" selected={false} onSelect={onSelect} />);
    const btn = screen.getByRole('button', { name: 'Zapnuté' });
    fireEvent.pointerDown(btn);
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('renders dense and rightDot props together', () => {
    render(<OptionRow label="Zapnuté" selected onSelect={() => {}} dense rightDot />);
    const btn = screen.getByRole('button', { name: 'Zapnuté' });
    expect(btn.className).toMatch(/p-2/);
    const dot = btn.querySelector('div.w-2.h-2.rounded-full');
    expect(dot).toBeInTheDocument();
  });
});


