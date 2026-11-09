import { renderHook } from '@testing-library/react';

import type { SkillsDescriptionScreenProps } from '../types';
import { useStableScreenProps } from './useStableScreenProps';

/**
 * Stabilné vstupy obrazovky Popis ponuky (nálezy 322 a 323): `initialTags` má rovnakú referenciu, kým sa nezmení jeho
 * obsah, každá funkcia `on…` je stabilná a volá vždy najnovšiu funkciu rodiča, ostatné vstupy sa nemenia.
 */
type Props = SkillsDescriptionScreenProps;

const baseProps = (over: Partial<Props> = {}): Props => ({
  category: 'Domácnosť',
  subcategory: 'Upratovanie',
  onBack: jest.fn(),
  ...over,
});

/** Všetky funkcie rodiča, ktoré obrazovka pozná, každá ako samostatný `jest.fn`. */
const allCallbacks = () => ({
  onBack: jest.fn(),
  onDescriptionChange: jest.fn(),
  onDetailedDescriptionChange: jest.fn(),
  onTagsChange: jest.fn(),
  onDistrictChange: jest.fn(),
  onCountryCodeChange: jest.fn(),
  onDistrictCodeChange: jest.fn(),
  onLocationChange: jest.fn(),
  onExperienceChange: jest.fn(),
  onPriceChange: jest.fn(),
  onUrgencyChange: jest.fn(),
  onDurationTypeChange: jest.fn(),
  onImagesChange: jest.fn(),
  onExistingImagesChange: jest.fn(),
  onRemoveExistingImage: jest.fn(),
  onOpeningHoursChange: jest.fn(),
  onIsHiddenChange: jest.fn(),
});

describe('useStableScreenProps: initialTags', () => {
  it('nové pole s rovnakým obsahom nezmení referenciu', () => {
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps({ initialTags: ['a', 'b'] }),
    });
    const first = result.current.initialTags;

    rerender(baseProps({ initialTags: ['a', 'b'] }));
    rerender(baseProps({ initialTags: ['a', 'b'] }));

    expect(result.current.initialTags).toBe(first);
    expect(first).toEqual(['a', 'b']);
  });

  it('zmena obsahu (iný text, iný počet, iné poradie) dá nové pole a to sa zasa drží', () => {
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps({ initialTags: ['a', 'b'] }),
    });
    const first = result.current.initialTags;

    rerender(baseProps({ initialTags: ['a', 'c'] }));
    const afterText = result.current.initialTags;
    expect(afterText).not.toBe(first);
    expect(afterText).toEqual(['a', 'c']);

    rerender(baseProps({ initialTags: ['a', 'c', 'd'] }));
    expect(result.current.initialTags).toEqual(['a', 'c', 'd']);

    rerender(baseProps({ initialTags: ['d', 'c', 'a'] }));
    const reordered = result.current.initialTags;
    expect(reordered).toEqual(['d', 'c', 'a']);

    rerender(baseProps({ initialTags: ['d', 'c', 'a'] }));
    expect(result.current.initialTags).toBe(reordered);
  });

  it('bez tagov (undefined aj prázdne pole) vráti stále to isté prázdne pole', () => {
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps(),
    });
    const empty = result.current.initialTags;
    expect(empty).toEqual([]);

    rerender(baseProps());
    rerender(baseProps({ initialTags: [] }));
    rerender(baseProps({ initialTags: [] }));

    expect(result.current.initialTags).toBe(empty);
  });

  it('rodič môže tagy doplniť neskôr a aj ich zasa zmazať', () => {
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps({ initialTags: [] }),
    });

    rerender(baseProps({ initialTags: ['kvet'] }));
    expect(result.current.initialTags).toEqual(['kvet']);

    rerender(baseProps({ initialTags: undefined }));
    expect(result.current.initialTags).toEqual([]);
  });
});

describe('useStableScreenProps: funkcie rodiča', () => {
  it('každá funkcia má v prekresleniach tú istú referenciu, aj keď rodič dá novú', () => {
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps({ ...allCallbacks() }),
    });
    const first = { ...result.current };

    rerender(baseProps({ ...allCallbacks() }));
    rerender(baseProps({ ...allCallbacks() }));

    Object.keys(allCallbacks()).forEach((name) => {
      const key = name as keyof ReturnType<typeof allCallbacks>;
      expect(typeof result.current[key]).toBe('function');
      expect(result.current[key]).toBe(first[key]);
    });
  });

  it('stabilná funkcia zavolá najnovšiu funkciu rodiča a nie starú', () => {
    const older = jest.fn();
    const newer = jest.fn();
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps({ onCountryCodeChange: older }),
    });
    const stable = result.current.onCountryCodeChange;

    rerender(baseProps({ onCountryCodeChange: newer }));
    stable?.('SK');

    expect(older).not.toHaveBeenCalled();
    expect(newer).toHaveBeenCalledTimes(1);
    expect(newer).toHaveBeenCalledWith('SK');
  });

  it('všetky funkcie sa odovzdajú s argumentmi a vráti sa ich výsledok', async () => {
    const callbacks = allCallbacks();
    callbacks.onRemoveExistingImage.mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps({ ...callbacks }),
    });

    Object.entries(callbacks).forEach(([name, fn]) => {
      const stable = (result.current as unknown as Record<string, (...args: unknown[]) => unknown>)[name];
      stable('x', 2);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('x', 2);
    });
    await expect(result.current.onRemoveExistingImage?.(7)).resolves.toEqual([{ id: 1 }]);
  });

  it('funkcia, ktorú rodič nedal, ostane nedefinovaná; keď ju dá neskôr, je stabilná', () => {
    const { result, rerender } = renderHook((props: Props) => useStableScreenProps(props), {
      initialProps: baseProps(),
    });
    expect(result.current.onRemoveExistingImage).toBeUndefined();
    expect(result.current.onTagsChange).toBeUndefined();

    const remove = jest.fn().mockResolvedValue([]);
    rerender(baseProps({ onRemoveExistingImage: remove }));
    const stable = result.current.onRemoveExistingImage;
    expect(typeof stable).toBe('function');
    stable?.(3);
    expect(remove).toHaveBeenCalledWith(3);

    rerender(baseProps());
    expect(result.current.onRemoveExistingImage).toBeUndefined();

    rerender(baseProps({ onRemoveExistingImage: remove }));
    expect(result.current.onRemoveExistingImage).toBe(stable);
  });

  it('ostatné vstupy sa nemenia: rovnaké referencie a hodnoty', () => {
    const experience = { value: 3, unit: 'years' as const };
    const openingHours = { monday: { enabled: true, from: '08:00', to: '16:00' } };
    const images = [{ id: 1, image_url: 'https://example.test/a.jpg' }];
    const props = baseProps({
      isSeeking: true,
      initialDescription: 'popis',
      initialExperience: experience,
      initialOpeningHours: openingHours,
      initialImages: images,
      initialPriceFrom: 10,
      initialCountryCode: 'CZ',
      initialDistrictCode: 'benesov',
      accountType: 'business',
    });

    const { result } = renderHook(() => useStableScreenProps(props));

    expect(result.current.category).toBe('Domácnosť');
    expect(result.current.subcategory).toBe('Upratovanie');
    expect(result.current.isSeeking).toBe(true);
    expect(result.current.initialDescription).toBe('popis');
    expect(result.current.initialExperience).toBe(experience);
    expect(result.current.initialOpeningHours).toBe(openingHours);
    expect(result.current.initialImages).toBe(images);
    expect(result.current.initialPriceFrom).toBe(10);
    expect(result.current.initialCountryCode).toBe('CZ');
    expect(result.current.initialDistrictCode).toBe('benesov');
    expect(result.current.accountType).toBe('business');
  });
});
