import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import SkillDescriptionModal from '../SkillDescriptionModal';

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
}

function renderEditWindow(initialTags: string[], onSave = jest.fn().mockResolvedValue(undefined)) {
  setInnerWidth(1280);
  render(
    <SkillDescriptionModal
      isOpen
      onClose={jest.fn()}
      category="Remeslá"
      subcategory="Maľovanie"
      onSave={onSave}
      initialDescription="Popis ponuky"
      initialTags={initialTags}
      initialCountryCode="SK"
      initialDistrictCode="bratislava-i"
    />,
  );
  return { onSave };
}

// Tagy sú 3. argument onSave (popis, prax, tagy, ...).
const savedTags = (onSave: jest.Mock) => onSave.mock.calls[0][2];

describe('SkillDescriptionModal – tagy pri úprave existujúcej ponuky', () => {
  it('po otvorení ukáže uložené tagy ponuky', async () => {
    renderEditWindow(['alfa', 'beta']);

    await screen.findByLabelText('Vstup pre tagy');

    expect(screen.getByText(/#alfa/)).toBeInTheDocument();
    expect(screen.getByText(/#beta/)).toBeInTheDocument();
  });

  it('uloženie bez zásahu do tagov pošle pôvodné tagy', async () => {
    const { onSave } = renderEditWindow(['alfa', 'beta']);

    fireEvent.click(await screen.findByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedTags(onSave)).toEqual(['alfa', 'beta']);
  });

  it('pridanie nového tagu a uloženie pošle pôvodné tagy aj nový', async () => {
    const { onSave } = renderEditWindow(['alfa', 'beta']);
    const input = await screen.findByLabelText('Vstup pre tagy');

    fireEvent.change(input, { target: { value: 'gama' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedTags(onSave)).toEqual(['alfa', 'beta', 'gama']);
  });

  it('odstránenie jedného tagu a uloženie pošle ostatné', async () => {
    const { onSave } = renderEditWindow(['alfa', 'beta']);

    fireEvent.click(await screen.findByLabelText('Odstrániť tag alfa'));
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedTags(onSave)).toEqual(['beta']);
  });
});
