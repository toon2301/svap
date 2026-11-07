/**
 * `BlurredContainImage` hlási zlyhanie chráneného obrázka najnovším `onError` (nález 292).
 *
 * Referencia na handler sa aktualizuje v efekte, nie počas renderu, a to PRED efektom, ktorý chybu hlási. Efekty
 * jedného komponentu bežia v poradí deklarácie, takže hlásiaci efekt vidí handler z toho istého vykreslenia. Testy
 * stráža toto poradie a to, že sa handler nevolá zbytočne; zápis počas renderu sa správaním od zápisu v efekte
 * nelíši, preto jeho neprítomnosť overuje samostatná statická kontrola mimo Jestu (pozri popis commitu).
 */

import { render } from '@testing-library/react';
import BlurredContainImage from './BlurredContainImage';

/** Podmenený `useProtectedImage`: test určuje, kedy hook ohlási chybu a kedy sa zmení handler. */
const mockUseProtectedImage = jest.fn();
jest.mock('./useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => mockUseProtectedImage(src),
}));

const SRC = 'https://backend.example.com/api/auth/portfolio/5/images/13/file/?variant=medium';

/** Stav hooka pre chránený obrázok: `isError` určuje, či jeho stiahnutie zlyhalo. */
const hookState = (isError: boolean) => ({ resolvedSrc: null, isProtected: true, isLoading: false, isError });

beforeEach(() => {
  mockUseProtectedImage.mockReset();
  mockUseProtectedImage.mockReturnValue(hookState(false));
});

describe('BlurredContainImage: hlásenie zlyhania chráneného obrázka', () => {
  it('keď sa v tom istom vykreslení zmení handler aj chyba, zavolá sa nový handler, nie starý', () => {
    const oldHandler = jest.fn();
    const newHandler = jest.fn();
    const { rerender } = render(<BlurredContainImage src={SRC} alt="Foto" onError={oldHandler} />);

    mockUseProtectedImage.mockReturnValue(hookState(true));
    rerender(<BlurredContainImage src={SRC} alt="Foto" onError={newHandler} />);

    expect(newHandler).toHaveBeenCalledTimes(1);
    expect(oldHandler).not.toHaveBeenCalled();
  });

  it('chyba hlásená už pri prvom vykreslení zavolá handler raz', () => {
    mockUseProtectedImage.mockReturnValue(hookState(true));
    const handler = jest.fn();

    render(<BlurredContainImage src={SRC} alt="Foto" onError={handler} />);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('výmena handlera pri nezmenenej chybe ho nevolá znova', () => {
    mockUseProtectedImage.mockReturnValue(hookState(true));
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = render(<BlurredContainImage src={SRC} alt="Foto" onError={first} />);

    rerender(<BlurredContainImage src={SRC} alt="Foto" onError={second} />);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('bez chyby sa handler nevolá, ani keď sa vymení', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = render(<BlurredContainImage src={SRC} alt="Foto" onError={first} />);

    rerender(<BlurredContainImage src={SRC} alt="Foto" onError={second} />);

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('handler vymenený medzi dvoma chybami dostane až tú druhú', () => {
    const first = jest.fn();
    const second = jest.fn();
    mockUseProtectedImage.mockReturnValue(hookState(true));
    const { rerender } = render(<BlurredContainImage src={SRC} alt="Foto" onError={first} />);

    mockUseProtectedImage.mockReturnValue(hookState(false));
    rerender(<BlurredContainImage src={SRC} alt="Foto" onError={second} />);
    mockUseProtectedImage.mockReturnValue(hookState(true));
    rerender(<BlurredContainImage src={SRC} alt="Foto" onError={second} />);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('bez handlera chyba nič nehodí', () => {
    mockUseProtectedImage.mockReturnValue(hookState(true));

    expect(() => render(<BlurredContainImage src={SRC} alt="Foto" />)).not.toThrow();
  });
});
