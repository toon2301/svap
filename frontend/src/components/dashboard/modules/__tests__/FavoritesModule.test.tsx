import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FavoritesModule from '../FavoritesModule';

// Mock framer-motion for deterministic tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('FavoritesModule', () => {
  it('renders header and tabs, removes a favorite user', () => {
    render(<FavoritesModule />);
    expect(screen.getByText('Oblúbené')).toBeInTheDocument();
    expect(screen.getByText('Používatelia')).toBeInTheDocument();
    expect(screen.getByText('Zručnosti')).toBeInTheDocument();

    // Two mock users rendered initially
    expect(screen.getByText('Jana Nováková')).toBeInTheDocument();
    expect(screen.getByText('Peter Kováč')).toBeInTheDocument();

    // Click the remove button of the SECOND card (simpler to target globally)
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    // After removal, first user remains, second user is removed
    expect(screen.getByText('Jana Nováková')).toBeInTheDocument();
    expect(screen.queryByText('Peter Kováč')).not.toBeInTheDocument();
  });

  it('switches to skills tab and shows empty state', () => {
    render(<FavoritesModule />);
    fireEvent.click(screen.getByText('Zručnosti'));
    expect(screen.getByText('Žiadne obľúbené zručnosti')).toBeInTheDocument();
  });
});


