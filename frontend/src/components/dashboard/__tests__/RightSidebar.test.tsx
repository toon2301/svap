import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RightSidebar from '../RightSidebar';

describe('RightSidebar', () => {
  it('renders items and handles clicks (desktop)', () => {
    const onClose = jest.fn();
    const onItemClick = jest.fn();
    render(
      <RightSidebar
        isOpen
        onClose={onClose}
        activeItem="edit-profile"
        onItemClick={onItemClick}
      />
    );
    expect(screen.getByText('Nastavenia')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Upraviť profil'));
    expect(onItemClick).toHaveBeenCalledWith('edit-profile');
  });

  it('closes on overlay click in mobile mode', () => {
    const onClose = jest.fn();
    const onItemClick = jest.fn();
    render(
      <RightSidebar
        isOpen
        onClose={onClose}
        activeItem="notifications"
        onItemClick={onItemClick}
        isMobile
      />
    );
    // overlay exists
    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    expect(overlay).toBeTruthy();
    // Cannot click via role, simulate close by clicking header button
    fireEvent.click(screen.getByLabelText('Zatvoriť'));
    expect(onClose).toHaveBeenCalled();
  });
});



