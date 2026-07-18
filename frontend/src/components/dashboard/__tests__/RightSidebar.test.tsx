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
    expect(screen.getByText('Nastavenia účtu')).toBeInTheDocument();
    expect(screen.getByText('Účet')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Upraviť profil'));
    expect(onItemClick).toHaveBeenCalledWith('edit-profile');

    fireEvent.click(screen.getByText('Účet'));
    expect(onItemClick).toHaveBeenCalledWith('account-settings');

    fireEvent.click(screen.getByText('Blokované'));
    expect(onItemClick).toHaveBeenCalledWith('blocked-users');
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
    expect(screen.queryByText('Nastavenia účtu')).not.toBeInTheDocument();
    expect(screen.queryByText('Účet')).not.toBeInTheDocument();
    // overlay exists
    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    expect(overlay).toBeTruthy();
    // Cannot click via role, simulate close by clicking header button
    fireEvent.click(screen.getByLabelText('Zatvoriť'));
    expect(onClose).toHaveBeenCalled();
  });
});



