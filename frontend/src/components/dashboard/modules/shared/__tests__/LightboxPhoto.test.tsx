/**
 * Jedna fotka vo fullscreen prehliadači (nález 291): zlyhanú fotku nahradí viditeľnou náhradou namiesto pokazeného
 * obrázka alebo prázdneho rámika. Stav zlyhania patrí jednej fotke, preto rodič používa `key` = adresa fotky.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LightboxPhoto from '../LightboxPhoto';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

/** Podmenený `useProtectedImage`: test určí, čo hook pre danú adresu vráti. */
const mockUseProtectedImage = jest.fn();
jest.mock('../useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => mockUseProtectedImage(src),
}));

const SRC = 'https://cdn.test/photos/1.webp';
const LABEL = 'Fotku sa nepodarilo načítať';

/** Hook pre verejnú adresu: vráti ju priamo, bez sťahovania. */
const publicImage = (src: string | null) => ({ resolvedSrc: src, isProtected: false, isLoading: false, isError: false });

beforeEach(() => {
  mockUseProtectedImage.mockReset();
  mockUseProtectedImage.mockImplementation(publicImage);
});

describe('LightboxPhoto', () => {
  it('verejná fotka sa ukáže ako obrázok so zadaným popisom a test id', () => {
    render(<LightboxPhoto src={SRC} alt="Fotka ponuky" testId="lb" />);

    const image = screen.getByTestId('lb-image');
    expect(image).toHaveAttribute('src', SRC);
    expect(image).toHaveAttribute('alt', 'Fotka ponuky');
    expect(image).toHaveClass('max-h-[calc(100vh-2rem)]', 'rounded-2xl', 'object-contain');
    expect(mockUseProtectedImage).toHaveBeenCalledWith(SRC);
  });

  it('s pevným rámcom vyplní celú plochu', () => {
    render(<LightboxPhoto src={SRC} alt="Fotka" testId="lb" fixedFrame />);

    expect(screen.getByTestId('lb-image')).toHaveClass('h-full', 'w-full', 'object-contain');
  });

  it('keď sa obrázok nenačíta, ukáže náhradu s textom a obrázok zmizne', () => {
    render(<LightboxPhoto src={SRC} alt="Fotka" testId="lb" />);

    fireEvent.error(screen.getByTestId('lb-image'));

    expect(screen.getByTestId('lb-failed')).toHaveTextContent(LABEL);
    expect(screen.getByRole('img', { name: LABEL })).toBeInTheDocument();
    expect(screen.queryByTestId('lb-image')).not.toBeInTheDocument();
  });

  it('náhrada má svetlé farby na tmavom podklade prehliadača', () => {
    render(<LightboxPhoto src={SRC} alt="Fotka" testId="lb" />);
    fireEvent.error(screen.getByTestId('lb-image'));

    expect(screen.getByTestId('lb-failed')).toHaveClass('bg-white/5', 'text-white/70');
  });

  it('náhrada má rovnakú plochu ako rámik počas načítavania, aby sa nič neposunulo', () => {
    render(<LightboxPhoto src={SRC} alt="Fotka" testId="lb" />);
    fireEvent.error(screen.getByTestId('lb-image'));

    expect(screen.getByTestId('lb-failed').parentElement).toHaveClass(
      'h-[70vh]',
      'w-[70vw]',
      'max-h-[calc(100vh-2rem)]',
      'rounded-2xl',
    );
  });

  it('chránená fotka, ktorej stiahnutie zlyhalo (hook hlási chybu), ukáže tú istú náhradu', () => {
    mockUseProtectedImage.mockReturnValue({ resolvedSrc: null, isProtected: true, isLoading: false, isError: true });

    render(<LightboxPhoto src={SRC} alt="Fotka" testId="lb" />);

    expect(screen.getByTestId('lb-failed')).toHaveTextContent(LABEL);
    expect(screen.queryByTestId('lb-image')).not.toBeInTheDocument();
  });

  it('počas sťahovania chránenej fotky je len neutrálny rámik bez náhrady a bez obrázka', () => {
    mockUseProtectedImage.mockReturnValue({ resolvedSrc: null, isProtected: true, isLoading: true, isError: false });

    const { container } = render(<LightboxPhoto src={SRC} alt="Fotka" testId="lb" />);

    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lb-image')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('zlyhanie patrí jednej fotke: s novým `key` sa ďalšia fotka načíta odznova', () => {
    const { rerender } = render(<LightboxPhoto key="a" src="https://cdn.test/a.webp" alt="Fotka" testId="lb" />);
    fireEvent.error(screen.getByTestId('lb-image'));
    expect(screen.getByTestId('lb-failed')).toBeInTheDocument();

    rerender(<LightboxPhoto key="b" src="https://cdn.test/b.webp" alt="Fotka" testId="lb" />);

    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
    expect(screen.getByTestId('lb-image')).toHaveAttribute('src', 'https://cdn.test/b.webp');
  });
});
