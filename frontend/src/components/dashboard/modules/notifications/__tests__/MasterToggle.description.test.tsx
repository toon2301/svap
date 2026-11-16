import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import MasterToggle from '../MasterToggle';

/**
 * Opis hlavného vypínača na počítači (nález 321, časť (c), rozhodnutie R42): voliteľný `description` sa vykreslí pod
 * názvom (názov a opis nad sebou vľavo, vypínač vpravo ako doteraz) a vypínač naň ukazuje cez `aria-describedby`, ak rodič
 * nezadal vlastné `describedBy`. Bez `description` sa vykreslenie ani atribúty nemenia: komponent používajú aj ďalšie
 * obrazovky (profil, ceny, otváracie hodiny) a mobilné rozloženie Upozornení, ktoré opis vykresľuje samo.
 */
const LABEL = 'Vypnúť všetko';
const DESCRIPTION =
  'Vypne všetky upozornenia okrem Správ. Nové žiadosti o zručnosť sa aj tak zobrazia v Žiadostiach, len bez odznaku.';

describe('MasterToggle: opis pod názvom', () => {
  it('opis je vidno a vypínač naň ukazuje cez `aria-describedby`; názov sa nezdvojí', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} description={DESCRIPTION} />);

    const toggle = screen.getByRole('switch', { name: LABEL });
    const description = screen.getByText(DESCRIPTION);
    expect(description).toBeVisible();
    expect(description.id).not.toBe('');
    expect(toggle).toHaveAttribute('aria-describedby', description.id);
    expect(toggle).toHaveAccessibleDescription(DESCRIPTION);
    expect(screen.getAllByText(LABEL)).toHaveLength(1);
  });

  it('opis je pod názvom v tom istom ľavom stĺpci, ktorý sa dá zalomiť, a vypínač je za ním a nezmenší sa', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} description={DESCRIPTION} />);

    const label = screen.getByText(LABEL);
    const description = screen.getByText(DESCRIPTION);
    const toggle = screen.getByRole('switch', { name: LABEL });
    expect(label.parentElement).toBe(description.parentElement);
    expect(label.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(label.parentElement?.nextElementSibling).toBe(toggle);
    // Dlhý opis sa v stĺpci zalomí a neprekryje vypínač: stĺpec sa môže zúžiť (`min-w-0`) a má odstup od vypínača.
    expect(label.parentElement).toHaveClass('min-w-0', 'pr-4');
    expect(toggle).toHaveClass('shrink-0');
  });

  it('štýl opisu je rovnaký ako pri sekciách na počítači (menší sivý text, v tmavom režime svetlejší)', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} description={DESCRIPTION} />);

    expect(screen.getByText(DESCRIPTION)).toHaveClass('text-sm', 'text-gray-600', 'dark:text-gray-400');
    expect(screen.getByText(LABEL)).toHaveClass('text-sm', 'font-medium', 'text-gray-900', 'dark:text-white');
  });

  it('kliknutie na vypínač s opisom funguje ako predtým', () => {
    const onChange = jest.fn();
    render(<MasterToggle enabled={false} onChange={onChange} label={LABEL} description={DESCRIPTION} />);

    fireEvent.click(screen.getByRole('switch', { name: LABEL }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it.each([
    ['počas načítania', { loading: true }],
    ['pri neznámej polohe (`enabled` null)', { enabled: null }],
    ['pri zakázanom vypínači', { disabled: true }],
  ])('opis ostáva a vypínač naň ukazuje aj %s', (_label, props) => {
    render(
      <MasterToggle
        enabled={false}
        onChange={jest.fn()}
        label={LABEL}
        description={DESCRIPTION}
        testId="vypinac"
        {...props}
      />,
    );

    const description = screen.getByText(DESCRIPTION);
    const toggle = screen.getByTestId('vypinac');
    expect(toggle).toHaveAccessibleName(LABEL);
    expect(description).toBeVisible();
    expect(toggle).toHaveAttribute('aria-describedby', description.id);
  });

  it('zadané `describedBy` rodiča má prednosť a nevznikne duplicitné prepojenie', () => {
    render(
      <div>
        <div id="externy-opis">Opis od rodiča.</div>
        <MasterToggle
          enabled={false}
          onChange={jest.fn()}
          label={LABEL}
          description={DESCRIPTION}
          describedBy="externy-opis"
        />
      </div>,
    );

    const toggle = screen.getByRole('switch', { name: LABEL });
    expect(toggle).toHaveAttribute('aria-describedby', 'externy-opis');
    expect(toggle).toHaveAccessibleDescription('Opis od rodiča.');
    expect(screen.getByText(DESCRIPTION).id).not.toBe('externy-opis');
  });

  it('s prázdnym názvom (mobilné rozloženie, názov a opis vykresľuje rodič) sa vlastný opis nevykreslí', () => {
    render(
      <div>
        <div id="externy-nazov">{LABEL}</div>
        <MasterToggle
          enabled={false}
          onChange={jest.fn()}
          label=""
          compact
          labelledBy="externy-nazov"
          description={DESCRIPTION}
        />
      </div>,
    );

    expect(screen.queryByText(DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: LABEL })).not.toHaveAttribute('aria-describedby');
  });

  it('prázdny opis sa nevykreslí a nevznikne prepojenie', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} description="" />);

    expect(document.querySelector('p')).toBeNull();
    expect(screen.getByRole('switch', { name: LABEL })).not.toHaveAttribute('aria-describedby');
  });

  it('dva vypínače s opisom majú navzájom rôzne identifikátory opisu a každý ukazuje na svoj text', () => {
    render(
      <div>
        <MasterToggle enabled={false} onChange={jest.fn()} label="Prvý" description="Prvý opis." />
        <MasterToggle enabled label="Druhý" onChange={jest.fn()} description="Druhý opis." />
      </div>,
    );

    const first = screen.getByRole('switch', { name: 'Prvý' });
    const second = screen.getByRole('switch', { name: 'Druhý' });
    expect(first.getAttribute('aria-describedby')).not.toBe(second.getAttribute('aria-describedby'));
    expect(first).toHaveAccessibleDescription('Prvý opis.');
    expect(second).toHaveAccessibleDescription('Druhý opis.');
  });

  it('po odstránení `description` zmizne opis aj prepojenie', () => {
    const { rerender } = render(
      <MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} description={DESCRIPTION} />,
    );
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();

    rerender(<MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} />);

    expect(screen.queryByText(DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: LABEL })).not.toHaveAttribute('aria-describedby');
  });
});

/**
 * Referenčné DOM pred pridaním `description` (zachytené z pôvodného komponentu): bez `description` je výstup rovnaký znak
 * po znaku, takže sa nezmenia ďalšie obrazovky, ktoré komponent používajú. Identifikátory z `useId` sa nahradia `ID`.
 */
const normalizeIds = (html: string) => html.replace(/_r_[0-9a-z]+_|«r[0-9a-z]+»|:r[0-9a-z]+:/g, 'ID');

const SWITCH_CLASS =
  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed';
const BUTTON_STYLE = 'style="transform: scaleY(0.8); transform-origin: left center;"';
const KNOB = 'absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out';
const LABEL_CLASS = 'text-sm font-medium text-gray-900 dark:text-white';
const COMPACT_ROOT =
  'flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800';

type Props = ComponentProps<typeof MasterToggle>;

describe('MasterToggle: bez `description` je DOM rovnaký ako doteraz', () => {
  const noop = () => undefined;

  const CASES: Array<[string, Props, string]> = [
    [
      'bežný vypnutý vypínač s názvom',
      { enabled: false, onChange: noop, label: LABEL },
      `<div class="flex items-center justify-between"><span id="ID" class="${LABEL_CLASS}">${LABEL}</span><button type="button" role="switch" aria-checked="false" aria-labelledby="ID" class="${SWITCH_CLASS} disabled:opacity-50 bg-gray-300 dark:bg-gray-600" ${BUTTON_STYLE}><span class="${KNOB} left-1"></span></button></div>`,
    ],
    [
      'zapnutý zakázaný vypínač s `testId`',
      { enabled: true, disabled: true, onChange: noop, label: LABEL, testId: 'x' },
      `<div class="flex items-center justify-between"><span id="ID" class="${LABEL_CLASS}">${LABEL}</span><button type="button" role="switch" aria-checked="true" aria-labelledby="ID" disabled="" data-testid="x" class="${SWITCH_CLASS} disabled:opacity-50 bg-purple-400 border border-purple-400" ${BUTTON_STYLE}><span class="${KNOB} left-6"></span></button></div>`,
    ],
    [
      'kompaktný vypínač s názvom a opisom od rodiča (`labelledBy`, `describedBy`) a neznámou polohou',
      { enabled: null, compact: true, onChange: noop, label: '', labelledBy: 'n', describedBy: 'o' },
      `<div class="${COMPACT_ROOT}"><span class="${LABEL_CLASS}"></span><button type="button" aria-labelledby="n" aria-describedby="o" disabled="" class="${SWITCH_CLASS} disabled:opacity-50 bg-gray-200 dark:bg-gray-700" ${BUTTON_STYLE}></button></div>`,
    ],
    [
      'načítavanie',
      { enabled: false, loading: true, onChange: noop, label: LABEL },
      `<div class="flex items-center justify-between"><span id="ID" class="${LABEL_CLASS}">${LABEL}</span><button type="button" aria-labelledby="ID" disabled="" aria-busy="true" class="${SWITCH_CLASS}  invisible" ${BUTTON_STYLE}></button></div>`,
    ],
    [
      'neznáma poloha',
      { enabled: null, onChange: noop, label: LABEL },
      `<div class="flex items-center justify-between"><span id="ID" class="${LABEL_CLASS}">${LABEL}</span><button type="button" aria-labelledby="ID" disabled="" class="${SWITCH_CLASS} disabled:opacity-50 bg-gray-200 dark:bg-gray-700" ${BUTTON_STYLE}></button></div>`,
    ],
    [
      'kompaktný vypínač s názvom a `describedBy` od rodiča',
      { enabled: true, compact: true, onChange: noop, label: 'Názov', describedBy: 'o' },
      `<div class="${COMPACT_ROOT}"><span id="ID" class="${LABEL_CLASS}">Názov</span><button type="button" role="switch" aria-checked="true" aria-labelledby="ID" aria-describedby="o" class="${SWITCH_CLASS} disabled:opacity-50 bg-purple-400 border border-purple-400" ${BUTTON_STYLE}><span class="${KNOB} left-6"></span></button></div>`,
    ],
  ];

  it.each(CASES)('%s', (_name, props, expected) => {
    const { container } = render(<MasterToggle {...props} />);

    expect(normalizeIds(container.innerHTML)).toBe(expected);
  });

  it('nemá `aria-describedby` ani opisný odsek', () => {
    render(<MasterToggle enabled={false} onChange={jest.fn()} label={LABEL} />);

    expect(screen.getByRole('switch', { name: LABEL })).not.toHaveAttribute('aria-describedby');
    expect(document.querySelector('p')).toBeNull();
  });
});
