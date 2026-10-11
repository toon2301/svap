import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import TagsSection, { type TagsSectionRef } from '../skillDescriptionModal/sections/TagsSection';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, defaultValue: string) => defaultValue,
  }),
}));

// Pomocná funkcia – nasimulovanie šírky okna pred renderom
function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  fireEvent.resize(window);
}

function renderMobile(tags: string[] = [], onChange = jest.fn()) {
  setInnerWidth(375);
  return { result: render(<TagsSection tags={tags} onTagsChange={onChange} isOpen />), onChange };
}

function renderDesktop(tags: string[] = [], onChange = jest.fn()) {
  setInnerWidth(1280);
  return { result: render(<TagsSection tags={tags} onTagsChange={onChange} isOpen />), onChange };
}

afterEach(() => {
  jest.restoreAllMocks();
  // reset na mobile default pre jsdom
  setInnerWidth(375);
});

// ──────────────────────────────────────────────
// Mobile
// ──────────────────────────────────────────────
describe('TagsSection – mobile', () => {
  it('pridá tag po kliknutí na fajku pri platnom vstupe', () => {
    const { onChange } = renderMobile();

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'test' } });
    fireEvent.click(screen.getByLabelText('Pridať tag'));

    expect(onChange).toHaveBeenCalledWith(['test']);
  });

  it('vyčistí input po pridaní tagu', () => {
    renderMobile();
    const input = screen.getByLabelText('Vstup pre tagy');

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByLabelText('Pridať tag'));

    expect(input).toHaveValue('');
  });

  it('fajka je disabled pri prázdnom vstupe', () => {
    renderMobile();
    expect(screen.getByLabelText('Pridať tag')).toBeDisabled();
  });

  it('button je disabled pri duplicitnom tagu (case-insensitive)', () => {
    // canAdd = false pri duplicate → button disabled, addTag() sa nevolá
    renderMobile(['Test']);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'test' } });

    expect(screen.getByLabelText('Pridať tag')).toBeDisabled();
  });

  it('nepridá tag s viac ako 15 znakmi a zobrazí chybu', () => {
    const ref = React.createRef<TagsSectionRef>();
    const onChange = jest.fn();
    setInnerWidth(375);
    render(<TagsSection ref={ref} tags={[]} onTagsChange={onChange} isOpen />);

    // Simulujeme priame volanie addTag s dlhým tagom cez ref (obchádza maxLength atribút)
    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'abcdefghijklmnop' } });
    ref.current?.addTag();

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Tag môže mať maximálne 15 znakov')).toBeInTheDocument();
  });

  it('blokuje pridanie piateho+ tagu (max 5)', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const existingTags = ['a', 'b', 'c', 'd', 'e'];
    const { onChange } = renderMobile(existingTags);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'f' } });
    // canAdd je false (tags.length >= 5) → tlačidlo disabled → klik nemá efekt
    expect(screen.getByLabelText('Pridať tag')).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('normalizuje tag s trailing čiarkou (tag, → tag)', () => {
    const { onChange } = renderMobile();

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'hello,' } });
    fireEvent.click(screen.getByLabelText('Pridať tag'));

    expect(onChange).toHaveBeenCalledWith(['hello']);
  });

  it('canAddTag() cez ref vracia true pri platnom vstupe', () => {
    setInnerWidth(375);
    const ref = React.createRef<TagsSectionRef>();
    render(<TagsSection ref={ref} tags={[]} onTagsChange={jest.fn()} isOpen />);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'ok' } });

    expect(ref.current?.canAddTag()).toBe(true);
  });

  it('canAddTag() cez ref vracia false pri prázdnom vstupe', () => {
    setInnerWidth(375);
    const ref = React.createRef<TagsSectionRef>();
    render(<TagsSection ref={ref} tags={[]} onTagsChange={jest.fn()} isOpen />);

    expect(ref.current?.canAddTag()).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Desktop
// ──────────────────────────────────────────────
describe('TagsSection – desktop', () => {
  it('Enter pridá tag', () => {
    const { onChange } = renderDesktop();

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'desk' } });
    fireEvent.keyDown(screen.getByLabelText('Vstup pre tagy'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['desk']);
  });

  it('čiarka pridá tag', () => {
    const { onChange } = renderDesktop();

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'desk' } });
    fireEvent.keyDown(screen.getByLabelText('Vstup pre tagy'), { key: ',' });

    expect(onChange).toHaveBeenCalledWith(['desk']);
  });

  it('nepridá duplicitný tag a zobrazí chybu (desktop)', () => {
    const { onChange } = renderDesktop(['desk']);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'desk' } });
    fireEvent.keyDown(screen.getByLabelText('Vstup pre tagy'), { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Tento tag už máš pridaný')).toBeInTheDocument();
  });

  it('fajka (mobile button) nie je viditeľná na desktop', () => {
    renderDesktop();
    expect(screen.queryByLabelText('Pridať tag')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Synchronizácia s hodnotou od rodiča
// ──────────────────────────────────────────────
describe('TagsSection – synchronizácia s hodnotou od rodiča', () => {
  // Okno úpravy ponuky sa otvorí s prázdnym zoznamom a uložené tagy mu rodič
  // doplní až po prvom vykreslení.
  it('zobrazí tagy, ktoré prídu v props až po prvom vykreslení', () => {
    setInnerWidth(1280);
    const { rerender } = render(<TagsSection tags={[]} onTagsChange={jest.fn()} isOpen />);

    rerender(<TagsSection tags={['alfa', 'beta']} onTagsChange={jest.fn()} isOpen />);

    expect(screen.getByText(/#alfa/)).toBeInTheDocument();
    expect(screen.getByText(/#beta/)).toBeInTheDocument();
  });

  it('po oneskorenom príchode tagov pridanie nového ponechá pôvodné', () => {
    setInnerWidth(1280);
    const onChange = jest.fn();
    const { rerender } = render(<TagsSection tags={[]} onTagsChange={onChange} isOpen />);
    rerender(<TagsSection tags={['alfa', 'beta']} onTagsChange={onChange} isOpen />);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'gama' } });
    fireEvent.keyDown(screen.getByLabelText('Vstup pre tagy'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['alfa', 'beta', 'gama']);
    expect(screen.getByText(/#alfa/)).toBeInTheDocument();
    expect(screen.getByText(/#gama/)).toBeInTheDocument();
  });

  it('po oneskorenom príchode tagov odstránenie jedného pošle rodičovi ostatné', () => {
    setInnerWidth(1280);
    const onChange = jest.fn();
    const { rerender } = render(<TagsSection tags={[]} onTagsChange={onChange} isOpen />);
    rerender(<TagsSection tags={['alfa', 'beta']} onTagsChange={onChange} isOpen />);

    fireEvent.click(screen.getByLabelText('Odstrániť tag alfa'));

    expect(onChange).toHaveBeenCalledWith(['beta']);
    expect(screen.queryByText(/#alfa/)).not.toBeInTheDocument();
  });

  it('zmena zoznamu rodičom sa prejaví aj pri odobratí tagu', () => {
    setInnerWidth(1280);
    const { rerender } = render(<TagsSection tags={['alfa', 'beta']} onTagsChange={jest.fn()} isOpen />);

    rerender(<TagsSection tags={['alfa']} onTagsChange={jest.fn()} isOpen />);

    expect(screen.getByText(/#alfa/)).toBeInTheDocument();
    expect(screen.queryByText(/#beta/)).not.toBeInTheDocument();
  });

  it('zmena obsahu pri rovnakom počte tagov sa prejaví', () => {
    setInnerWidth(1280);
    const { rerender } = render(<TagsSection tags={['alfa', 'beta']} onTagsChange={jest.fn()} isOpen />);

    rerender(<TagsSection tags={['alfa', 'gama']} onTagsChange={jest.fn()} isOpen />);

    expect(screen.getByText(/#gama/)).toBeInTheDocument();
    expect(screen.queryByText(/#beta/)).not.toBeInTheDocument();
  });

  it('zmena poradia od rodiča sa prejaví v zozname', () => {
    setInnerWidth(1280);
    const { container, rerender } = render(
      <TagsSection tags={['alfa', 'beta']} onTagsChange={jest.fn()} isOpen />,
    );

    rerender(<TagsSection tags={['beta', 'alfa']} onTagsChange={jest.fn()} isOpen />);

    const shown = Array.from(container.querySelectorAll('.skill-modal-tags > span')).map((el) =>
      (el.textContent ?? '').replace('×', ''),
    );
    expect(shown).toEqual(['#beta', '#alfa']);
  });

  it('pridaný tag nezanikne ani pri ďalšom vykreslení po príchode tagov od rodiča', () => {
    setInnerWidth(1280);
    const { rerender } = render(<TagsSection tags={[]} onTagsChange={jest.fn()} isOpen />);
    rerender(<TagsSection tags={['alfa']} onTagsChange={jest.fn()} isOpen />);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'gama' } });
    fireEvent.keyDown(screen.getByLabelText('Vstup pre tagy'), { key: 'Enter' });
    rerender(<TagsSection tags={['alfa']} onTagsChange={jest.fn()} isOpen />);

    expect(screen.getByText(/#alfa/)).toBeInTheDocument();
    expect(screen.getByText(/#gama/)).toBeInTheDocument();
  });

  it('nové pole s rovnakým obsahom nič nezmení a nič nepošle rodičovi', () => {
    setInnerWidth(1280);
    const onChange = jest.fn();
    const { rerender } = render(<TagsSection tags={['alfa', 'beta']} onTagsChange={onChange} isOpen />);

    rerender(<TagsSection tags={['alfa', 'beta']} onTagsChange={onChange} isOpen />);

    expect(screen.getByText(/#alfa/)).toBeInTheDocument();
    expect(screen.getByText(/#beta/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  // Lokálna kópia existuje kvôli okamžitej odozve: pridaný tag je vidieť hneď,
  // aj keď rodič nový zoznam zatiaľ nepošle späť.
  it('tag pridaný používateľom ostane vidieť, kým rodič nepošle nový zoznam', () => {
    setInnerWidth(1280);
    const { rerender } = render(<TagsSection tags={['alfa']} onTagsChange={jest.fn()} isOpen />);

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'gama' } });
    fireEvent.keyDown(screen.getByLabelText('Vstup pre tagy'), { key: 'Enter' });
    rerender(<TagsSection tags={['alfa']} onTagsChange={jest.fn()} isOpen />);

    expect(screen.getByText(/#gama/)).toBeInTheDocument();
  });
});
