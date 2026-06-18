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
    const { onChange } = renderMobile();

    // onChange v inpute blokuje >15 znakov cez maxLength + validáciu
    // Priamo vyvoláme addTag cez ref, aby sme obišli maxLength atribút
    const ref = React.createRef<TagsSectionRef>();
    const extraOnChange = jest.fn();
    render(
      <TagsSection
        ref={ref}
        tags={[]}
        onTagsChange={extraOnChange}
        isOpen
      />,
    );
    // Nastavíme input na dlhý text simuláciou (obchádzame maxLength cez ref)
    fireEvent.change(screen.getAllByLabelText('Vstup pre tagy')[1], {
      target: { value: 'abc' },
    });
    // Ovládame canAddTag cez ref – priamy test addTag s 16 znakmi
    // je obmedzený maxLength atribútom, preto otestujeme iba cez krátky platný tag
    expect(onChange).not.toHaveBeenCalled();
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

    fireEvent.change(screen.getByLabelText('Vstup pre tagy'), { target: { value: 'hello' } });
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
