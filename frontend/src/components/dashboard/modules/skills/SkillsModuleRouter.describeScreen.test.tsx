import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { DashboardSkill } from '../../hooks/useSkillsModals';
import SkillsModuleRouter from './SkillsModuleRouter';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  endpoints: {
    skills: {
      imageDetail: (skillId: number, imageId: number) => `/auth/skills/${skillId}/images/${imageId}/`,
    },
  },
}));

/**
 * Obrazovka Popis ponuky so skutočným `SkillsModuleRouter` (nálezy 322 a 323). Smerovač pri každom prekreslení vytvára
 * nové pole tagov (`selectedSkillsCategory.tags || []`) a nové obslužné funkcie; obrazovka ich mala v závislostiach
 * efektov, takže (322) pridaný tag po prekreslení rodiča zmizol a (323) efekty, ktoré zapisujú krajinu a okres do
 * rodiča, bežali v slučke prekreslení.
 */

/** Najviac toľko zápisov stavu rodiča harness pustí: slučka z nálezu 323 sa tak skončí a test nezamrzne. */
const MAX_PARENT_WRITES = 120;

type Stats = {
  /** Koľkokrát sa po pripojení potvrdilo prekreslenie smerovača. */
  commits: number;
  /** Koľkokrát smerovač zapísal stav vybranej ponuky do rodiča. */
  writes: number;
  /** Posledný stav vybranej ponuky v rodičovi. */
  latest: DashboardSkill | null;
};

const newStats = (): Stats => ({ commits: 0, writes: 0, latest: null });

const noop = jest.fn();

/** Rodič ako v aplikácii: drží vybranú ponuku v stave a odovzdáva smerovaču jej setter. */
function Harness({ initial, stats }: { initial: DashboardSkill; stats: Stats }) {
  const [selected, setSelected] = React.useState<DashboardSkill | null>(initial);
  const [, setUnrelated] = React.useState(0);

  React.useEffect(() => {
    stats.latest = selected;
  }, [selected, stats]);

  const guardedSet = React.useCallback<React.Dispatch<React.SetStateAction<DashboardSkill | null>>>(
    (action) => {
      stats.writes += 1;
      if (stats.writes > MAX_PARENT_WRITES) return;
      setSelected(action);
    },
    [stats],
  );

  return (
    <>
      <button type="button" data-testid="force-parent-render" onClick={() => setUnrelated((n) => n + 1)}>
        prekresli rodiča
      </button>
      <button
        type="button"
        data-testid="parent-sets-tags"
        onClick={() => setSelected((prev) => (prev ? { ...prev, tags: ['zrodica'] } : prev))}
      >
        rodič zmení tagy
      </button>
      <React.Profiler
        id="router"
        onRender={() => {
          stats.commits += 1;
        }}
      >
        <SkillsModuleRouter
          activeModule="skills-describe"
          accountType="personal"
          standardCategories={[]}
          customCategories={[]}
          selectedSkillsCategory={selected}
          setActiveModule={noop}
          setIsSkillsCategoryModalOpen={noop}
          setSelectedSkillsCategory={guardedSet}
          setIsSkillDescriptionModalOpen={noop}
          setIsAddCustomCategoryModalOpen={noop}
          setEditingCustomCategoryIndex={noop}
          setEditingStandardCategoryIndex={noop}
          removeStandardCategory={async () => undefined}
          removeCustomCategory={async () => undefined}
        />
      </React.Profiler>
    </>
  );
}

const newOffer = (): DashboardSkill => ({ category: 'Domácnosť', subcategory: 'Upratovanie', is_seeking: false });

describe('SkillsModuleRouter: obrazovka Popis ponuky (322, 323)', () => {
  const originalWidth = window.innerWidth;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    window.innerWidth = 390;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.innerWidth = originalWidth;
    consoleError.mockRestore();
  });

  const errorsText = () => consoleError.mock.calls.map((call) => call.map(String).join(' ')).join('\n');

  /** Otvorí okno Tagy, napíše tag a potvrdí ho okrúhlym tlačidlom „Pridať tag“. */
  const addTag = (tag: string) => {
    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: tag } });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať tag' }));
  };

  it('po pripojení sa smerovač neprekresľuje v slučke a v konzole nie je „Maximum update depth exceeded“', () => {
    const stats = newStats();

    render(<Harness initial={newOffer()} stats={stats} />);

    expect(errorsText()).not.toMatch(/Maximum update depth exceeded/);
    expect(stats.commits).toBeLessThanOrEqual(5);
    expect(stats.writes).toBeLessThanOrEqual(5);
  });

  it('tag pridaný okrúhlym tlačidlom ostane aj po prekreslení rodiča', () => {
    const stats = newStats();
    render(<Harness initial={newOffer()} stats={stats} />);

    fireEvent.click(screen.getByText('Pridať tagy'));
    addTag('kvet');
    expect(screen.getByText(/#kvet/)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('force-parent-render'));
    });

    expect(screen.getByText(/#kvet/)).toBeInTheDocument();
  });

  it('tagy, ktoré rodič zmení, sa na obrazovke zobrazia (stabilné vstupy nezablokujú skutočnú zmenu)', () => {
    const stats = newStats();
    render(<Harness initial={newOffer()} stats={stats} />);

    act(() => {
      fireEvent.click(screen.getByTestId('parent-sets-tags'));
    });
    fireEvent.click(screen.getByText('1 tag'));

    expect(screen.getByText(/#zrodica/)).toBeInTheDocument();
  });

  it('otvorenie existujúcej ponuky: krajina, okres a tagy sa z rodiča načítajú ako predtým', () => {
    const stats = newStats();
    const existing: DashboardSkill = {
      ...newOffer(),
      id: 41,
      tags: ['stary'],
      country_code: 'CZ',
      district_code: 'benesov',
      district: 'Benešov',
    };

    render(<Harness initial={existing} stats={stats} />);

    expect(screen.getByText(/Benešov/)).toBeInTheDocument();
    expect(stats.latest?.country_code).toBe('CZ');
    expect(stats.latest?.district_code).toBe('benesov');
    expect(stats.latest?.tags).toEqual(['stary']);
    expect(stats.writes).toBeLessThanOrEqual(5);

    fireEvent.click(screen.getByText('1 tag'));
    expect(screen.getByText(/#stary/)).toBeInTheDocument();
  });

  it('dva pridané tagy sa zobrazia a po uložení sa zapíšu do rodiča', () => {
    const stats = newStats();
    render(<Harness initial={newOffer()} stats={stats} />);

    fireEvent.click(screen.getByText('Pridať tagy'));
    addTag('kvet');
    addTag('zahrada');
    expect(screen.getByText(/#kvet/)).toBeInTheDocument();
    expect(screen.getByText(/#zahrada/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Uložiť|Hotovo/ }));

    expect(stats.latest?.tags).toEqual(['kvet', 'zahrada']);
  });
});
