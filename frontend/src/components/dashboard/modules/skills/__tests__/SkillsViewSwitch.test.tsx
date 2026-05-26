import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import SkillsDesktopSection from '../SkillsDesktopSection';
import SkillsMobileSection from '../SkillsMobileSection';

const t = (_key: string, defaultValue: string) => defaultValue;

describe('Skills view switch', () => {
  it('renders the desktop switch button and calls the provided handler', () => {
    const onViewSwitchClick = jest.fn();

    render(
      <SkillsDesktopSection
        t={t}
        title="Ponukam title"
        isSeeking={false}
        firstOptionText="Vyber kategoriu"
        standardCategories={[]}
        customCategories={[]}
        viewSwitchLabel="Hladam"
        viewSwitchAriaLabel="Prepnut na Hladam"
        onViewSwitchClick={onViewSwitchClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Prepnut na Hladam' }));

    expect(onViewSwitchClick).toHaveBeenCalledTimes(1);
  });

  it('renders the mobile switch button and calls the provided handler', () => {
    const onViewSwitchClick = jest.fn();

    render(
      <SkillsMobileSection
        t={t}
        isSeeking
        firstOptionText="Vyber co hladas"
        standardCategories={[]}
        customCategories={[]}
        viewSwitchLabel="Ponukam"
        viewSwitchAriaLabel="Prepnut na Ponukam"
        onViewSwitchClick={onViewSwitchClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Prepnut na Ponukam' }));

    expect(onViewSwitchClick).toHaveBeenCalledTimes(1);
  });
});
