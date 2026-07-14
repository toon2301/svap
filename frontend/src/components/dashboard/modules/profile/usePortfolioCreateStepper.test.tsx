jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

jest.mock('./portfolioApi', () => ({ createPortfolioItem: jest.fn() }));

jest.mock('./portfolioCreateSubmit', () => ({
  showPortfolioCreateErrors: jest.fn(),
  uploadPortfolioFiles: jest.fn(),
}));

import type { FormEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { usePortfolioCreateStepper } from './usePortfolioCreateStepper';
import { createPortfolioItem } from './portfolioApi';
import { showPortfolioCreateErrors, uploadPortfolioFiles } from './portfolioCreateSubmit';
import type { PortfolioItem } from './portfolioTypes';

type StepperResult = { current: ReturnType<typeof usePortfolioCreateStepper> };

const submitEvent = () =>
  ({ preventDefault: jest.fn() }) as unknown as FormEvent<HTMLFormElement>;

function advanceToPhotosStep(result: StepperResult) {
  act(() => result.current.handleChange('title', 'My work'));
  act(() => result.current.goNext()); // title -> category
  act(() => result.current.handleChange('category', 'it-a-technologie'));
  act(() => result.current.goNext()); // category -> description
  act(() => result.current.goNext()); // description (optional) -> photos
}

function renderStepper(overrides?: {
  onCancel?: () => void;
  onCreated?: (item: PortfolioItem) => void;
}) {
  const onCancel = overrides?.onCancel ?? jest.fn();
  const onCreated = overrides?.onCreated ?? jest.fn();
  const view = renderHook(() => usePortfolioCreateStepper({ onCancel, onCreated }));
  return { ...view, onCancel, onCreated };
}

describe('usePortfolioCreateStepper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createPortfolioItem as jest.Mock).mockReset();
    (uploadPortfolioFiles as jest.Mock).mockReset();
    (showPortfolioCreateErrors as jest.Mock).mockReset();
    (toast.error as jest.Mock).mockReset();
  });

  it('submits successfully and calls onCreated with the created item', async () => {
    const created = { id: 42, title: 'My work' } as PortfolioItem;
    (createPortfolioItem as jest.Mock).mockResolvedValue(created);
    const { result, onCreated } = renderStepper();

    advanceToPhotosStep(result);
    expect(result.current.step).toBe('photos');

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(createPortfolioItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My work', category: 'it-a-technologie' }),
    );
    expect(uploadPortfolioFiles).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.createdWithUploadIssue).toBeNull();
  });

  it('enters createdWithUploadIssue when the photo upload fails after create', async () => {
    const created = { id: 7, title: 'My work' } as PortfolioItem;
    (createPortfolioItem as jest.Mock).mockResolvedValue(created);
    (uploadPortfolioFiles as jest.Mock).mockRejectedValue(new Error('upload failed'));
    const { result, onCreated } = renderStepper();

    advanceToPhotosStep(result);
    act(() =>
      result.current.handlePhotosChange([
        new File(['x'], 'p.jpg', { type: 'image/jpeg' }),
      ]),
    );

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(uploadPortfolioFiles).toHaveBeenCalledWith(7, expect.any(Array));
    expect(result.current.createdWithUploadIssue).toEqual(created);
    expect(result.current.submitError).toBeTruthy();
    expect(toast.error).toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();

    // Ďalší submit v tomto stave otvorí vytvorené portfólio (bez ďalšieho create).
    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(createPortfolioItem).toHaveBeenCalledTimes(1);
  });

  it('blocks advancing to the next step when the current step is invalid', () => {
    const { result } = renderStepper();

    // Prázdny title na kroku 'title' → neposunie sa a nastaví chybu.
    act(() => result.current.goNext());
    expect(result.current.step).toBe('title');
    expect(result.current.errors.title).toBeTruthy();
    expect(showPortfolioCreateErrors).toHaveBeenCalled();

    // Po vyplnení sa posunie ďalej.
    act(() => result.current.handleChange('title', 'Valid title'));
    act(() => result.current.goNext());
    expect(result.current.step).toBe('category');
  });

  it('gates requestClose: cancels when clean, shows discard confirm when dirty', () => {
    const { result, onCancel } = renderStepper();

    // Čistý draft → priamy onCancel, žiadny discard confirm.
    act(() => result.current.requestClose());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(result.current.showDiscardConfirm).toBe(false);

    // Špinavý draft → discard confirm, žiadny ďalší onCancel.
    act(() => result.current.handleChange('title', 'draft'));
    act(() => result.current.requestClose());
    expect(result.current.showDiscardConfirm).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
