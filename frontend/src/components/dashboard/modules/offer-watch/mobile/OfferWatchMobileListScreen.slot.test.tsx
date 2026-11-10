import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { OfferWatch } from '../types';
import OfferWatchMobileListScreen from './OfferWatchMobileListScreen';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    /** Preklad bez slovníka: vráti záložný text, a ak nie je, kľúč. */
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

/**
 * Odznak počtu a miesto pre tlačidlo a hlášku o limite (nález 309). Kým sa zoznam načítava, odznak ukazuje „− / 5“,
 * nie nepravdivé „0 / 5“. Tlačidlo „Vytvoriť sledovanie“ a hláška o limite sú v jednom mriežkovom políčku, ktorého
 * výšku určuje vyššia z nich, takže ich výmena po načítaní piatich sledovaní nepohne obsahom (v prehliadači bol
 * posun CLS 0,0325). Druhá z dvojice sa nevykresľuje, jej miesto drží neviditeľná rezerva s textom v atribúte.
 */
const LIMIT_MESSAGE = 'Dosiahol si limit 5 sledovaní. Ak chceš pridať nové, jedno z existujúcich vymaž.';

function watch(id: number): OfferWatch {
  return {
    id,
    category: 'Domácnosť',
    subcategory: 'Upratovanie',
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  };
}

const watches = (count: number) => Array.from({ length: count }, (_, index) => watch(index + 1));

const baseProps = {
  isLoading: false,
  hasLoadError: false,
  mutation: null,
  onBack: jest.fn(),
  onCreate: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onRetry: jest.fn(),
} as const;

const badge = () => screen.getByLabelText('Počet uložených sledovaní');
const slot = () => screen.getByTestId('offer-watch-create-slot');
const createButton = () => screen.queryByRole('button', { name: 'Vytvoriť sledovanie' });
const reserve = () => screen.queryByTestId('offer-watch-limit-reserve');

describe('OfferWatchMobileListScreen: odznak počtu (nález 309)', () => {
  it('počas načítavania ukáže „− / 5“, nie nepravdivé „0 / 5“', () => {
    render(<OfferWatchMobileListScreen {...baseProps} isLoading watches={[]} />);

    expect(badge()).toHaveTextContent('− / 5');
    expect(screen.queryByText('0 / 5')).not.toBeInTheDocument();
  });

  it('po načítaní bez sledovaní je „0 / 5“', () => {
    render(<OfferWatchMobileListScreen {...baseProps} watches={[]} />);

    expect(badge()).toHaveTextContent('0 / 5');
  });

  it('po načítaní piatich sledovaní je „5 / 5“, po načítaní troch „3 / 5“', () => {
    const view = render(<OfferWatchMobileListScreen {...baseProps} watches={watches(5)} />);
    expect(badge()).toHaveTextContent('5 / 5');

    view.rerender(<OfferWatchMobileListScreen {...baseProps} watches={watches(3)} />);
    expect(badge()).toHaveTextContent('3 / 5');
  });

  it('číslice odznaku majú rovnakú šírku (tabular-nums), aby sa odznak pri príchode počtu nezúžil ani nerozšíril', () => {
    render(<OfferWatchMobileListScreen {...baseProps} isLoading watches={[]} />);

    expect(badge()).toHaveClass('tabular-nums');
  });
});

describe('OfferWatchMobileListScreen: jedno miesto pre tlačidlo a hlášku o limite (nález 309)', () => {
  it('počas načítavania je tlačidlo (zakázané) a hlášky o limite ešte niet', () => {
    render(<OfferWatchMobileListScreen {...baseProps} isLoading watches={[]} />);

    expect(createButton()).toBeDisabled();
    expect(screen.queryByText(LIMIT_MESSAGE)).not.toBeInTheDocument();
  });

  it('po načítaní piatich sledovaní je hláška o limite a tlačidlo nie, bez rezervy miesta', () => {
    render(<OfferWatchMobileListScreen {...baseProps} watches={watches(5)} />);

    expect(createButton()).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(LIMIT_MESSAGE);
    expect(reserve()).not.toBeInTheDocument();
  });

  it('po načítaní bez sledovaní je tlačidlo a hláška o limite nie', () => {
    render(<OfferWatchMobileListScreen {...baseProps} watches={[]} />);

    expect(createButton()).toBeEnabled();
    expect(screen.queryByText(LIMIT_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('miesto sa pri načítaní piatich sledovaní nevymení za nový uzol: ostane to isté políčko', () => {
    const view = render(<OfferWatchMobileListScreen {...baseProps} isLoading watches={[]} />);
    const before = slot();

    view.rerender(<OfferWatchMobileListScreen {...baseProps} watches={watches(5)} />);

    expect(slot()).toBe(before);
    expect(createButton()).not.toBeInTheDocument();
  });

  it('políčko má výšku aspoň ako tlačidlo a tlačidlo sa v ňom neťahá na výšku hlášky', () => {
    render(<OfferWatchMobileListScreen {...baseProps} watches={[]} />);

    expect(slot()).toHaveClass('grid', 'min-h-12', 'items-start');
    expect(createButton()).toHaveClass('col-start-1', 'row-start-1');
  });

  it('pri tlačidle drží miesto hlášky neviditeľná rezerva: skrytá, bez textu v DOM, s textom v atribúte', () => {
    render(<OfferWatchMobileListScreen {...baseProps} watches={watches(2)} />);

    const ghost = reserve() as HTMLElement;
    expect(ghost).toBeInTheDocument();
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).toHaveClass('invisible', 'col-start-1', 'row-start-1');
    expect(ghost).toHaveAttribute('data-ghost', LIMIT_MESSAGE);
    expect(ghost).toBeEmptyDOMElement();
    expect(slot()).toContainElement(ghost);
    // Text hlášky nie je v DOM dvakrát ani vtedy, keď je viditeľné tlačidlo.
    expect(screen.queryByText(LIMIT_MESSAGE)).not.toBeInTheDocument();
  });

  it('rezerva aj hláška majú rovnaký rámik a písmo, takže zaberajú rovnakú výšku', () => {
    const tokens = ['rounded-xl', 'border', 'px-4', 'py-3', 'text-sm'];
    const withButton = render(<OfferWatchMobileListScreen {...baseProps} watches={[]} />);
    const ghost = reserve() as HTMLElement;
    expect(ghost).toHaveClass(...tokens);
    withButton.unmount();

    render(<OfferWatchMobileListScreen {...baseProps} watches={watches(5)} />);
    expect(screen.getByRole('status')).toHaveClass(...tokens, 'col-start-1', 'row-start-1');
  });

  it('chyba načítania: tlačidlo je zakázané a odznak ukáže počet zo stavu (nezmenené správanie)', () => {
    render(<OfferWatchMobileListScreen {...baseProps} hasLoadError watches={[]} />);

    expect(createButton()).toBeDisabled();
    expect(badge()).toHaveTextContent('0 / 5');
  });
});
