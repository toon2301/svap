import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { FlipButton } from './FlipButton';

describe('FlipButton', () => {
  it('calls the toggle handler', () => {
    const onToggle = jest.fn();

    render(<FlipButton onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows the desktop hint only when requested', () => {
    const { container, rerender } = render(<FlipButton onToggle={jest.fn()} />);

    expect(container.querySelector('.desktop-card-flip-hint')).not.toBeInTheDocument();

    rerender(<FlipButton onToggle={jest.fn()} showHint />);

    expect(container.querySelector('.desktop-card-flip-hint')).toBeInTheDocument();
  });
});
