import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToggleCircle from '../ToggleCircle';

describe('ToggleCircle', () => {
  it('renders checkmark when selected', () => {
    const { container } = render(<ToggleCircle selected />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders no checkmark when not selected', () => {
    const { container } = render(<ToggleCircle selected={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeNull();
  });
});


