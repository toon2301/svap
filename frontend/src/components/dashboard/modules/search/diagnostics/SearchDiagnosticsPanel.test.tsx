import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SearchDiagnosticsPanel } from './SearchDiagnosticsPanel';
import type { SearchDiagnosticSnapshot } from './searchDiagnostics';

jest.unmock('@/contexts/LanguageContext');

const title = 'Diagnostika vyhľadávania';
const evidence: SearchDiagnosticSnapshot = {
  country: 'CZ', queryLength: 8, offerType: 'all', onlyMyLocation: false,
  priceMinSet: false, priceMaxSet: false, source: 'network', state: 'complete',
  httpStatus: 200, offersCount: 3, usersCount: 2, validCollections: true,
  manualCountrySnapshot: 'CZ', ipCountrySnapshot: 'SK', ipCacheFresh: true,
};

function mount(snapshot: SearchDiagnosticSnapshot | null, country: string | null = 'SK', enabled = true) {
  const setEnabled = jest.fn();
  render(<LanguageProvider><SearchDiagnosticsPanel
    diagnostics={{ enabled, snapshot, setEnabled }} country={country} showSkills showUsers={false}
  /></LanguageProvider>);
  return setEnabled;
}

function value(label: string) {
  const region = screen.getByRole('region', { name: title });
  return within(region).getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;
}

describe('SearchDiagnosticsPanel truthful missing and non-network values', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('appLastManualOfferCountryV1', 'SK');
  });

  it('distinguishes an unspecified current country from a deliberately omitted request country', () => {
    mount({ ...evidence, country: null }, null);
    expect(value('Aktuálna krajina vyhľadávania')).toBe('Neurčená');
    expect(value('Krajina filtra')).toBe('Neurčená');
    expect(value('Odoslaná krajina')).toBe('Neposlaná');
    expect(value('Zobrazovať používateľov')).toBe('Nie');
  });

  it.each(['cache', 'none'] as const)('does not claim a sent country for source %s', (source) => {
    mount({ ...evidence, source, httpStatus: null, offersCount: 0, usersCount: 0, validCollections: null });
    expect(value('Odoslaná krajina')).toBe('—');
    expect(value('HTTP stav')).toBe('—');
    expect(value('Počet vrátených kariet')).toBe('0');
    expect(value('Počet vrátených používateľov')).toBe('0');
    expect(value('Odpoveď obsahuje platné zoznamy')).toBe('—');
  });

  it('keeps missing response counts distinct from zero and missing preferences distinct from a request', () => {
    mount({
      ...evidence, httpStatus: null, offersCount: null, usersCount: null,
      manualCountrySnapshot: null, ipCountrySnapshot: null, ipCacheFresh: null,
      validCollections: false, state: 'pending',
    });
    expect(value('Počet vrátených kariet')).toBe('—');
    expect(value('Počet vrátených používateľov')).toBe('—');
    expect(value('Uložená ručná voľba krajiny')).toBe('Neurčená');
    expect(value('Uložená krajina z IP detekcie')).toBe('Neurčená');
    expect(value('IP záznam ešte platí')).toBe('—');
    expect(value('Odpoveď obsahuje platné zoznamy')).toBe('Nie');
    expect(value('Stav pokusu')).toBe('Prebieha');
  });

  it('shows a stale IP cache explicitly rather than omitting false values', () => {
    mount({ ...evidence, ipCacheFresh: false, onlyMyLocation: true, priceMinSet: true, priceMaxSet: true });
    expect(value('IP záznam ešte platí')).toBe('Nie');
    expect(value('Iba moja lokalita')).toBe('Áno');
    expect(value('Cena od je vyplnená')).toBe('Áno');
    expect(value('Cena do je vyplnená')).toBe('Áno');
  });

  it('waits for an explicit new attempt and normalizes unknown current country', () => {
    mount(null, 'private arbitrary country');
    expect(value('Aktuálna krajina vyhľadávania')).toBe('Neurčená');
    expect(screen.getByRole('status')).toHaveTextContent('Zopakuj vyhľadávanie');
    expect(screen.queryByText('HTTP stav')).not.toBeInTheDocument();
    expect(screen.getByRole('region')).not.toHaveTextContent('private arbitrary country');
  });

  it.each([true, false])('only invokes the toggle callback from enabled=%s', (enabled) => {
    const change = mount(null, 'SK', enabled);
    const button = screen.getByRole('button', { name: title });
    expect(button).toHaveAttribute('aria-expanded', String(enabled));
    fireEvent.click(button);
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith(!enabled);
  });

  it.each([
    ['error', 'Chyba'], ['cancelled', 'Zrušený'], ['empty', 'Prázdne vyhľadávanie'],
  ] as const)('translates state %s', (state, translated) => {
    mount({ ...evidence, state });
    expect(value('Stav pokusu')).toBe(translated);
  });
});
