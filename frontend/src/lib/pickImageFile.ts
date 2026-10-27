/**
 * Výber obrázka cez skrytý `<input type="file">`, ktorý je počas výberu pripojený do DOM.
 *
 * Prečo nie `document.createElement('input')` bez pripojenia: iOS WebKit môže takýto element počas
 * otvoreného výberu súboru odpratať a udalosť `change` sa potom nikdy nespustí – po výbere fotky sa nestane
 * nič a nezobrazí sa ani chyba (WebKit bug 201289, nález 201). Vstup preto žije v `document.body`
 * (mimo modalu, ktorý sa po ťuknutí zatvára) a odstráni sa po výbere alebo zrušení.
 */

let activePicker: HTMLInputElement | null = null;

/** Odpojí vstup z DOM a zabudne ho, ak je to ten aktívny. */
function removePicker(input: HTMLInputElement): void {
  input.remove();
  if (activePicker === input) activePicker = null;
}

/**
 * Otvorí výber obrázka a vybraný súbor odovzdá `onPick`. Treba ho volať priamo z ťuknutia používateľa,
 * inak ho prehliadač nepustí.
 */
export function pickImageFile(onPick: (file: File) => void, accept = 'image/*'): void {
  if (typeof document === 'undefined') return;
  // Výber, na ktorý prehliadač neodpovedal ani zrušením (staršie prehliadače bez `cancel`), by nechal vstup v DOM navždy.
  if (activePicker) removePicker(activePicker);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  input.setAttribute('data-image-picker', '');
  Object.assign(input.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  });

  input.addEventListener('change', () => {
    const file = input.files?.[0] ?? null;
    removePicker(input);
    if (file) onPick(file);
  });
  input.addEventListener('cancel', () => removePicker(input));

  document.body.appendChild(input);
  activePicker = input;
  input.click();
}
