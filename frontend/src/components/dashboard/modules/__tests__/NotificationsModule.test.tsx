import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsModule from '../NotificationsModule';

describe('NotificationsModule', () => {
  it('renders empty state', () => {
    render(<NotificationsModule />);
    expect(screen.getByText('Upozornenia')).toBeInTheDocument();
    expect(screen.getByText('Žiadne upozornenia')).toBeInTheDocument();
  });
});


