import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import SettingsDetailHeader from '../SettingsDetailHeader';

describe('SettingsDetailHeader', () => {
  it('renders an icon back button when a back handler is provided', () => {
    const onBack = jest.fn();

    render(
      <SettingsDetailHeader
        title="Upozornenia"
        backLabel="Spat"
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Spat' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Upozornenia' })).toBeInTheDocument();
  });

  it('does not render the back button without a back handler', () => {
    render(<SettingsDetailHeader title="Jazyk" backLabel="Spat" />);

    expect(screen.queryByRole('button', { name: 'Spat' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jazyk' })).toBeInTheDocument();
  });
});
