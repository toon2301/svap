/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 * Panel: bez príznaku nič (ani hooky, ani listenery), s príznakom záznam,
 * značky USER, Kopírovať, Vymazať a ignorovanie klikov v paneli.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ScrollDebugPanel from '../ScrollDebugPanel';
import { uninstallScrollDebug } from '../scrollDebugInstall';
import {
  SCROLL_DEBUG_FLAG_KEY,
  SCROLL_DEBUG_LOG_KEY,
  getScrollDebugLines,
  resetScrollDebugLogForTests,
} from '../scrollDebugLog';
import { resetScrollDebugStateForTests } from '../scrollDebugState';

const OUR_DOCUMENT_EVENTS = ['click', 'touchstart', 'touchmove', 'scroll', 'visibilitychange'];
const OUR_WINDOW_EVENTS = ['popstate', 'pageshow', 'pagehide'];
const realIntoView = Element.prototype.scrollIntoView;

async function renderPanel() {
  const view = render(<ScrollDebugPanel />);
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

beforeEach(() => {
  sessionStorage.clear();
  resetScrollDebugLogForTests();
  resetScrollDebugStateForTests();
  Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView;
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  uninstallScrollDebug();
  Element.prototype.scrollIntoView = realIntoView;
  window.history.replaceState(null, '', '/');
  jest.restoreAllMocks();
});

describe('bez príznaku', () => {
  it('nič nevykreslí, prototypy aj history ostanú pôvodné a nepribudne žiadny listener', async () => {
    const setter = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')?.set;
    const intoView = Element.prototype.scrollIntoView;
    const { pushState, replaceState } = window.history;
    const documentListener = jest.spyOn(document, 'addEventListener');
    const windowListener = jest.spyOn(window, 'addEventListener');

    const { container } = await renderPanel();

    expect(container).toBeEmptyDOMElement();
    expect(Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')?.set).toBe(setter);
    expect(Element.prototype.scrollIntoView).toBe(intoView);
    expect(window.history.pushState).toBe(pushState);
    expect(window.history.replaceState).toBe(replaceState);
    const ourDocumentCalls = documentListener.mock.calls.filter(([type]) => OUR_DOCUMENT_EVENTS.includes(type));
    const ourWindowCalls = windowListener.mock.calls.filter(([type]) => OUR_WINDOW_EVENTS.includes(type));
    expect(ourDocumentCalls).toEqual([]);
    expect(ourWindowCalls).toEqual([]);
    expect(getScrollDebugLines()).toEqual([]);
    expect(sessionStorage.getItem(SCROLL_DEBUG_LOG_KEY)).toBeNull();
  });

  it('?debugscroll=0 vypne aj predtým zapnutý pásik', async () => {
    sessionStorage.setItem(SCROLL_DEBUG_FLAG_KEY, '1');
    window.history.replaceState(null, '', '/dashboard?debugscroll=0');
    const { container } = await renderPanel();
    expect(container).toBeEmptyDOMElement();
    expect(sessionStorage.getItem(SCROLL_DEBUG_FLAG_KEY)).toBeNull();
  });
});

describe('s príznakom', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/dashboard?debugscroll=1');
  });

  it('vykreslí panel s hlavičkou štartu stránky a stav si zapamätá', async () => {
    await renderPanel();
    expect(screen.getByRole('button', { name: 'Kopírovať' })).toBeInTheDocument();
    expect(sessionStorage.getItem(SCROLL_DEBUG_FLAG_KEY)).toBe('1');
    const lines = getScrollDebugLines();
    expect(lines[0]).toMatch(/^— štart stránky — \S+ \/dashboard$/);
    expect(lines[1]).toMatch(/^ENV .* · ih=\d+ · vv=\? · dpr=1 · main\{\?\} · html\{sb=\?\} · body\{sb=\?\}$/);
    expect(screen.getByText(lines[0])).toBeInTheDocument();
  });

  it('značka USER nesie číslo posledného kliku; klik v paneli okno nezačne', async () => {
    await renderPanel();
    fireEvent.click(document.body);
    fireEvent.click(screen.getByRole('button', { name: 'ZOSPODU' }));
    fireEvent.click(screen.getByRole('button', { name: 'BEZ ZVÝRAZNENIA' }));
    const lines = getScrollDebugLines();
    expect(lines.filter((line) => line.includes(' CLICK '))).toHaveLength(1);
    expect(lines).toContainEqual(expect.stringMatching(/^C1 \+\d+ USER ZOSPODU @C1$/));
    expect(lines).toContainEqual(expect.stringMatching(/^C1 \+\d+ USER BEZ ZVÝRAZNENIA @C1$/));
  });

  it('Kopírovať vloží do schránky celý záznam s hlavičkou', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kopírovať' }));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const text: string = writeText.mock.calls[0][0];
    const [header, environment, ...rest] = text.split('\n');
    expect(header).toMatch(/^debugscroll · \S+ · riadkov: 3$/);
    expect(environment).toMatch(/^ENV /);
    expect(rest).toEqual(getScrollDebugLines());
    expect(rest[2]).toMatch(/USER OK @C0$/);
    expect(screen.getByText('skopírované 3')).toBeInTheDocument();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('Vymazať vyčistí záznam aj úložisko', async () => {
    await renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vymazať' }));
      await Promise.resolve();
    });
    expect(getScrollDebugLines()).toEqual([]);
    expect(JSON.parse(sessionStorage.getItem(SCROLL_DEBUG_LOG_KEY) ?? 'null')).toEqual([]);
    expect(screen.getByText('vymazané')).toBeInTheDocument();
  });
});
