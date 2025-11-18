import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Section from '../Section';

describe('Section extra', () => {
  it('allows toggling off when initially on', () => {
    const setValue = jest.fn();
    render(
      <Section
        title="Sekcia"
        description="Popis"
        value={true}
        setValue={setValue}
        offLabel="Vypnuté"
        onLabel="Zapnuté"
        desktop
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Vypnuté' }));
    expect(setValue).toHaveBeenCalledWith(false);
  });
});


