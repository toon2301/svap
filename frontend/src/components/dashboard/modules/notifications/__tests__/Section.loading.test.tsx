import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import Section from '../Section';

/**
 * Sekcia s voľbou „Vypnuté / Zapnuté“ pri načítavaní (nález 286): kým sa uložená voľba načítava, namiesto riadkov
 * je kostra rovnakej výšky. Bez `loading` sa sekcia správa ako doteraz.
 */
describe('Section: načítavanie uloženej voľby', () => {
  const renderSection = (props: Partial<React.ComponentProps<typeof Section>> = {}) =>
    render(
      <Section
        title="Správy"
        description="Popis správ"
        value
        setValue={jest.fn()}
        offLabel="Vypnuté"
        onLabel="Zapnuté"
        {...props}
      />,
    );

  it('počas načítavania ukáže kostru a nie riadky voľby, nadpis a popis ostanú', () => {
    renderSection({ loading: true, loadingLabel: 'Načítavam nastavenia...' });

    expect(screen.getByText('Správy')).toBeInTheDocument();
    expect(screen.getByText('Popis správ')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Vypnuté')).not.toBeInTheDocument();
    expect(screen.queryByText('Zapnuté')).not.toBeInTheDocument();
    const region = screen.getByTestId('section-options-skeleton');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Načítavam nastavenia...');
  });

  it('kostra desktopovej sekcie má hustejšie odsadenie ako mobilná', () => {
    const desktop = renderSection({ loading: true, desktop: true });
    screen.getAllByTestId('section-options-skeleton-row').forEach((row) => {
      expect(row).toHaveClass('p-2');
    });
    desktop.unmount();

    renderSection({ loading: true });
    screen.getAllByTestId('section-options-skeleton-row').forEach((row) => {
      expect(row).toHaveClass('p-4');
    });
  });

  it('po načítaní ukáže riadky s uloženou voľbou a kostra zmizne', () => {
    const { rerender } = renderSection({ loading: true });
    expect(screen.getByTestId('section-options-skeleton')).toBeInTheDocument();

    rerender(
      <Section
        title="Správy"
        description="Popis správ"
        value
        setValue={jest.fn()}
        offLabel="Vypnuté"
        onLabel="Zapnuté"
        loading={false}
      />,
    );

    expect(screen.queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vypnuté' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapnuté' })).toBeInTheDocument();
  });

  it('bez vlastnosti loading sa sekcia nezmenila: riadky sú hneď, kostra nie', () => {
    renderSection();

    expect(screen.queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
