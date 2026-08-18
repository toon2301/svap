import { act, renderHook } from '@testing-library/react';
import { writeLastManualOfferCountry } from '@/shared/offerCountryPreference';
import { useSkillsModals } from './useSkillsModals';

describe('useSkillsModals country preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    writeLastManualOfferCountry('PL');
  });

  it('replaces the legacy Slovakia default only when a new draft is created', () => {
    const { result } = renderHook(() => useSkillsModals());

    act(() => {
      result.current.setSelectedSkillsCategory({
        category: 'Domácnosť',
        subcategory: 'Maľovanie',
        country_code: 'SK',
        district_code: '',
        district: '',
        location: '',
      });
    });

    expect(result.current.selectedSkillsCategory?.country_code).toBe('PL');

    act(() => {
      result.current.setSelectedSkillsCategory((current) =>
        current ? { ...current, country_code: 'SK' } : current,
      );
    });

    expect(result.current.selectedSkillsCategory?.country_code).toBe('SK');
  });

  it('always preserves the saved country of an existing card', () => {
    const { result } = renderHook(() => useSkillsModals());

    act(() => {
      result.current.setSelectedSkillsCategory({
        id: 42,
        category: 'Domácnosť',
        subcategory: 'Maľovanie',
        country_code: 'SK',
      });
    });

    expect(result.current.selectedSkillsCategory?.country_code).toBe('SK');
  });
});
