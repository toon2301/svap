import { pickImageFile } from '../pickImageFile';

function pickerInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"][data-image-picker]'));
}

/** Simuluje, že používateľ vo výbere súboru vybral `file`. */
function choose(input: HTMLInputElement, file: File | null): void {
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true });
  input.dispatchEvent(new Event('change'));
}

describe('pickImageFile', () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    pickerInputs().forEach((input) => input.remove());
    clickSpy.mockRestore();
  });

  it('keeps a hidden image input attached to the document while the picker is open, and clicks it', () => {
    pickImageFile(jest.fn());

    const [input] = pickerInputs();
    expect(pickerInputs()).toHaveLength(1);
    expect(input.isConnected).toBe(true);
    expect(input.parentElement).toBe(document.body);
    expect(input.accept).toBe('image/*');
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.instances[0]).toBe(input);
  });

  it('hands the chosen file to the callback and removes the input', () => {
    const onPick = jest.fn();
    const file = new File([new Uint8Array([1, 2, 3])], 'IMG_1.jpg', { type: 'image/jpeg' });
    pickImageFile(onPick);
    const [input] = pickerInputs();

    choose(input, file);

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0] === file).toBe(true);
    expect(pickerInputs()).toHaveLength(0);
  });

  it('removes the input without calling back when the picker is cancelled', () => {
    const onPick = jest.fn();
    pickImageFile(onPick);
    const [input] = pickerInputs();

    input.dispatchEvent(new Event('cancel'));

    expect(onPick).not.toHaveBeenCalled();
    expect(pickerInputs()).toHaveLength(0);
  });

  it('ignores a change that carries no file, but still cleans up', () => {
    const onPick = jest.fn();
    pickImageFile(onPick);
    const [input] = pickerInputs();

    choose(input, null);

    expect(onPick).not.toHaveBeenCalled();
    expect(pickerInputs()).toHaveLength(0);
  });

  it('replaces a leftover input from a picker that was never answered', () => {
    pickImageFile(jest.fn());
    const [first] = pickerInputs();

    pickImageFile(jest.fn());

    expect(pickerInputs()).toHaveLength(1);
    expect(first.isConnected).toBe(false);
  });

  it('answers only to the latest picker', () => {
    const onFirst = jest.fn();
    const onSecond = jest.fn();
    pickImageFile(onFirst);
    pickImageFile(onSecond);
    const [input] = pickerInputs();

    choose(input, new File([new Uint8Array([1])], 'b.png', { type: 'image/png' }));

    expect(onFirst).not.toHaveBeenCalled();
    expect(onSecond).toHaveBeenCalledTimes(1);
  });

  it('uses a custom accept value when given', () => {
    pickImageFile(jest.fn(), 'image/png');

    expect(pickerInputs()[0].accept).toBe('image/png');
  });
});
