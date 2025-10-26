import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Section from '../Section';

describe('Section', () => {
  it('renders title/description and toggles on/off', () => {
    const setValue = jest.fn();
    render(
      <Section
        title="Sekcia"
        description="Popis"
        value={false}
        setValue={setValue}
        offLabel="Vypnuté"
        onLabel="Zapnuté"
        desktop
      />
    );
    expect(screen.getByText('Sekcia')).toBeInTheDocument();
    expect(screen.getByText('Popis')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapnuté' }));
    expect(setValue).toHaveBeenCalledWith(true);
  });
});


